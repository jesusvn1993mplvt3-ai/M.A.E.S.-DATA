export const generateCalendar = () => {
    const dates = [];
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const start = new Date(2025, 8, 1); 
    const end = new Date(2026, 11, 31);
    let idx = 0;
    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
        dates.push({
            index: idx++,
            id: `${['DOMINGO','LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'][d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`,
            shortDay: ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'][d.getDay()],
            dateNum: d.getDate(),
            month: months[d.getMonth()],
            monthIndex: d.getMonth(),
            year: d.getFullYear(), 
            isoDate: d.toISOString().split('T')[0] 
        });
    }
    return dates;
};

export const calculateConsumptionDetails = (order, producedQty = 0) => {
    if (!order) return { totalNeeded: 0, consumption: [], totalYarnKilos: 0, producedYarnKilos: 0 };

    const materials = order.materials || [];
    const waste = 1 + (Number(order.wastePercentage) / 100);
    
    let totalYarnGramsNeeded = 0;

    if (order.parts && order.parts.length > 0) {
        order.parts.forEach(part => {
            const partQty = Number(part.qty);
            const partWeight = Number(part.weight);
            totalYarnGramsNeeded += (partQty * partWeight);
        });
    } else {
        totalYarnGramsNeeded = Number(order.totalQty) * Number(order.pieceWeightGrams);
    }

    totalYarnGramsNeeded = totalYarnGramsNeeded * waste;
    const totalYarnKilos = totalYarnGramsNeeded / 1000;

    const consumption = materials
        .filter(m => m.name && m.percentage)
        .map(m => {
            const percent = Number(m.percentage) / 100;
            const kilosNeeded = (totalYarnKilos * percent);
            return { 
                name: m.name, 
                percentage: m.percentage, 
                kilosNeeded: kilosNeeded,
                kilosConsumed: 0 
            };
        });
    
    return { totalNeeded: order.totalQty, consumption, totalYarnKilos, producedYarnKilos: 0 };
};

export const calculateOrderMetrics = (machineId, order, allProductionData, allRows, globalHiddenDays) => {
    const metrics = { 
        isPlanned: false, finishDate: null, totalNeeded: 0, progress: 0, produced: 0, 
        dailyCapacity: 0, plannedToDate: 0, deviation: 0, status: 'OK',
        activePart: null, partsStatus: [], totalYarnConsumed: 0
    };
    
    if (!order || !order.startDate) return metrics;
    
    const todayISO = new Date().toISOString().split('T')[0];
    const dailyHours = order.operators && Array.isArray(order.operators) ? order.operators.length * 12 : Number(order.dailyHours || 12);
    const dailyMinutesCapacity = dailyHours * 60;
    const disabledDates = order.disabledDates || [];
    
    metrics.dailyCapacity = dailyMinutesCapacity;
    metrics.isPlanned = true;

    const isComposite = order.parts && order.parts.length > 0;
    let totalMinutesNeeded = 0;
    
    if (isComposite) {
        order.parts.forEach(p => {
            totalMinutesNeeded += Number(p.qty) * Number(p.time);
        });
    } else {
        totalMinutesNeeded = Number(order.totalQty) * Number(order.timePerPieceMin);
    }

    let totalMinutesProduced = 0;
    let totalItemsProduced = 0;
    let totalYarnConsumedGrams = 0;
    const wasteMult = 1 + (Number(order.wastePercentage || 0) / 100);

    let partsTracker = isComposite ? order.parts.map(p => ({...p, produced: 0})) : [];

    const startIndex = allRows.findIndex(r => r.isoDate === order.startDate);
    const todayIndex = allRows.findIndex(r => r.isoDate === todayISO);

    if (startIndex !== -1) {
        for (let i = startIndex; i < allRows.length; i++) {
            const row = allRows[i];
            const isFuture = i > todayIndex; 
            if (isFuture) break;

            const machineData = allProductionData[row.id]?.[machineId];
            if (machineData && machineData.slots) {
                machineData.slots.forEach(slot => {
                    if (slot.qty && slot.qty > 0) {
                        const slotModel = (slot.model || '').toUpperCase().trim();
                        const qty = Number(slot.qty);
                        
                        if (isComposite) {
                            const partIdx = partsTracker.findIndex(p => p.name.toUpperCase() === slotModel);
                            if (partIdx !== -1) {
                                partsTracker[partIdx].produced += qty;
                                totalMinutesProduced += (qty * Number(partsTracker[partIdx].time));
                                totalItemsProduced += qty;
                                totalYarnConsumedGrams += (qty * Number(partsTracker[partIdx].weight));
                            }
                        } else {
                            totalMinutesProduced += (qty * Number(order.timePerPieceMin));
                            totalItemsProduced += qty;
                            totalYarnConsumedGrams += (qty * Number(order.pieceWeightGrams));
                        }
                    }
                });
            }
        }
    }

    metrics.produced = totalItemsProduced;
    metrics.progress = totalMinutesNeeded > 0 ? Math.min(100, (totalMinutesProduced / totalMinutesNeeded) * 100) : 0;
    metrics.partsStatus = partsTracker;
    metrics.totalYarnConsumed = (totalYarnConsumedGrams * wasteMult) / 1000;

    if (isComposite) {
        metrics.activePart = partsTracker.find(p => p.produced < p.qty) || null;
    }

    let plannedMinutesToDate = 0;
    if (startIndex !== -1) {
        for (let i = startIndex; i < todayIndex; i++) {
             const row = allRows[i];
             if (!globalHiddenDays.includes(row.id) && !disabledDates.includes(row.isoDate)) {
                 plannedMinutesToDate += dailyMinutesCapacity;
             }
        }
    }
    
    const minutesDeviation = totalMinutesProduced - plannedMinutesToDate;
    metrics.deviation = isComposite ? Math.round(minutesDeviation / 60) : (totalItemsProduced - (plannedMinutesToDate / Number(order.timePerPieceMin))); 
    metrics.plannedToDate = isComposite ? Math.round(plannedMinutesToDate / 60) + ' hrs' : Math.floor(plannedMinutesToDate / Number(order.timePerPieceMin));

    const criticalDelayMinutes = dailyMinutesCapacity * 1.5; 
    if (minutesDeviation < -criticalDelayMinutes) metrics.status = 'ATRASO CRÍTICO';
    else if (minutesDeviation < 0) metrics.status = 'ATRASO LEVE';
    
    const remainingMinutes = Math.max(0, totalMinutesNeeded - totalMinutesProduced);
    
    if (remainingMinutes <= 0) {
        metrics.finishDate = todayISO;
        metrics.status = 'COMPLETADO';
        metrics.progress = 100;
        metrics.totalNeeded = 0;
        return metrics;
    }
    
    metrics.totalNeeded = isComposite ? 0 : (Number(order.totalQty) - totalItemsProduced);

    let projMinutes = remainingMinutes;
    let currentIdx = startIndex !== -1 ? startIndex : 0;
    if (todayIndex > currentIdx) currentIdx = todayIndex;

    for (let i = currentIdx; i < allRows.length; i++) {
        const row = allRows[i];
        if (globalHiddenDays.includes(row.id) || disabledDates.includes(row.isoDate)) continue;
        
        projMinutes -= dailyMinutesCapacity;
        if (projMinutes <= 0) {
            metrics.finishDate = row.isoDate;
            return metrics;
        }
    }

    metrics.finishDate = null;
    return metrics;
};
