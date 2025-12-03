import { MACHINES } from './constants.js';
import { calculateOrderMetrics } from './utils.js';
import { ReportModal } from './components.js';

const { useState, useMemo } = React;

export const OrderManager = React.forwardRef(({ onClose, onSaveOrders, onDeleteOrder, ordersData, allProductionData, allRows, hiddenDays }, ref) => {
    const [step, setStep] = useState(1);
    const [viewMode, setViewMode] = useState('list'); 
    const [modelName, setModelName] = useState('');
    const [selectedMachines, setSelectedMachines] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportConfig, setReportConfig] = useState(null);

    // Estado para modo compuesto
    const [isComposite, setIsComposite] = useState(false);
    const [parts, setParts] = useState([]); 

    const initialConfig = useMemo(() => ({
        totalQty: '', timePerPiece: '', startDate: new Date().toISOString().split('T')[0],
        operators: ['Andrés', 'Balta'], disabledDates: [], pieceWeightGrams: '',
        materials: [{name: 'LYCRA', percentage: ''}, {name: 'NYLON', percentage: ''}],
        wastePercentage: 0
    }), []);

    const [config, setConfig] = useState(initialConfig);

    // Funciones de Partes
    const addPart = () => setParts([...parts, { name: '', qty: '', time: '', weight: '' }]);
    const removePart = (idx) => setParts(parts.filter((_, i) => i !== idx));
    const updatePart = (idx, field, val) => {
        const newParts = [...parts];
        newParts[idx][field] = val;
        setParts(newParts);
    };

    const startNewOrderChain = (machineId) => {
       // ... lógica futura ...
    };
    React.useImperativeHandle(ref, () => ({ startNewOrderChain }));

    const toggleMachine = (id) => { setSelectedMachines(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]); };
    const toggleOperator = (op) => {
        setConfig(prev => {
            const current = prev.operators;
            if (current.includes(op)) { if (current.length === 1) return prev; return { ...prev, operators: current.filter(o => o !== op) }; }
            return { ...prev, operators: [...current, op] };
        });
    };
    
    const handleStartCreate = () => {
        setIsEditing(false); setModelName(''); setSelectedMachines([]); setConfig(initialConfig);
        setStep(1); setViewMode('create'); setIsComposite(false); setParts([]);
    };

    const handleStartEdit = (machineId, orderData) => {
        setIsEditing(true);
        setModelName(orderData.model);
        setSelectedMachines([machineId]); 
        const isComp = !!(orderData.parts && orderData.parts.length > 0);
        setIsComposite(isComp);
        setParts(orderData.parts || []);

        setConfig({
            totalQty: orderData.totalQty,
            timePerPiece: orderData.timePerPieceMin,
            startDate: orderData.startDate,
            operators: orderData.operators || ['Andrés'],
            disabledDates: orderData.disabledDates || [],
            pieceWeightGrams: orderData.pieceWeightGrams || '',
            materials: orderData.materials || [],
            wastePercentage: orderData.wastePercentage || 0,
        });
        setStep(1); setViewMode('create');
    };

    const handleFinalSave = () => {
        if (selectedMachines.length === 0) return;
        
        selectedMachines.forEach(mid => {
            let finalTotalYarnKilos = 0;
            const waste = 1 + (config.wastePercentage / 100);

            if (isComposite) {
                let totalMass = 0;
                parts.forEach(p => totalMass += (Number(p.qty) * Number(p.weight)));
                finalTotalYarnKilos = (totalMass * waste) / 1000;
            } else {
                 finalTotalYarnKilos = (Number(config.totalQty) * Number(config.pieceWeightGrams) * waste) / 1000;
            }

            const orderPayload = {
                model: modelName,
                startDate: config.startDate,
                operators: config.operators, 
                dailyHours: config.operators.length * 12, 
                disabledDates: config.disabledDates,
                materials: config.materials,
                wastePercentage: config.wastePercentage,
                totalYarnKilos: finalTotalYarnKilos,
                parts: isComposite ? parts : [],
                totalQty: isComposite ? parts.reduce((a,b)=>a+Number(b.qty),0) : Number(config.totalQty),
                timePerPieceMin: isComposite ? 0 : Number(config.timePerPiece), 
                pieceWeightGrams: isComposite ? 0 : Number(config.pieceWeightGrams),
            };
            onSaveOrders(mid, orderPayload);
        });
        setViewMode('list');
    };
    
    const validateStep = (s) => {
        if (s === 1 && !modelName) return false;
        if (s === 2 && selectedMachines.length === 0) return false;
        if (s === 3) {
            if (isComposite) {
                return parts.length > 0 && parts.every(p => p.name && p.qty && p.time && p.weight);
            }
            return config.totalQty && config.timePerPiece && config.pieceWeightGrams;
        }
        return true;
    }
    
    // --- UI RENDERERS ---

    const renderPartsConfig = () => (
        <div className="space-y-4 fade-in">
            <h3 className="text-lg font-bold text-white text-center mb-4">Configuración de Partes</h3>
            <div className="bg-blue-900/20 p-3 rounded-lg text-xs text-blue-200 mb-4 border border-blue-800">
                <i data-lucide="info" className="inline w-4 h-4 mr-1"></i>
                Define cada parte (Ej: Cuerpo, Manga). El nombre será lo que el operador debe ingresar en el sistema.
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {parts.map((p, i) => (
                    <div key={i} className="bg-slate-800 p-3 rounded border border-slate-700 flex flex-col gap-2 relative">
                        <button onClick={() => removePart(i)} className="absolute top-2 right-2 text-red-400"><i data-lucide="x" className="w-4 h-4"></i></button>
                        <div><label className="text-[10px] text-slate-400">Nombre Parte</label><input type="text" value={p.name} onChange={e => updatePart(i, 'name', e.target.value.toUpperCase())} placeholder="EJ: CUERPO" className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-white uppercase text-sm"/></div>
                        <div className="grid grid-cols-3 gap-2">
                            <div><label className="text-[10px] text-slate-400">Cant.</label><input type="number" value={p.qty} onChange={e => updatePart(i, 'qty', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-white text-sm"/></div>
                            <div><label className="text-[10px] text-slate-400">Min/Pza</label><input type="number" value={p.time} onChange={e => updatePart(i, 'time', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-white text-sm"/></div>
                            <div><label className="text-[10px] text-slate-400">Gr/Pza</label><input type="number" value={p.weight} onChange={e => updatePart(i, 'weight', e.target.value)} className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-white text-sm"/></div>
                        </div>
                    </div>
                ))}
            </div>
            <button onClick={addPart} className="w-full py-2 bg-slate-700 rounded text-sm font-bold text-white hover:bg-slate-600">+ Agregar Parte</button>
            <div><label className="text-xs text-slate-400 uppercase">Fecha Inicio</label><input type="date" value={config.startDate} onChange={e => setConfig({...config, startDate: e.target.value})} className="w-full bg-slate-900 border border-slate-600 p-3 rounded text-white" /></div>
        </div>
    );

    const renderSimpleConfig = () => (
        <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
                <label className="text-xs text-slate-400 uppercase mb-2 block">Operadores</label>
                <div className="flex gap-2">
                    {['Andrés', 'Balta'].map(op => {
                        const active = config.operators.includes(op);
                        return <button key={op} onClick={() => toggleOperator(op)} className={`flex-1 py-3 rounded-lg border font-bold text-sm ${active ? 'bg-blue-600 border-blue-400' : 'bg-slate-800'}`}>{op}</button>
                    })}
                </div>
            </div>
            <div><label className="text-xs text-slate-400 uppercase">Cantidad Total</label><input type="number" value={config.totalQty} onChange={e => setConfig({...config, totalQty: e.target.value})} className="w-full bg-slate-900 border border-slate-600 p-3 rounded text-white" /></div>
            <div><label className="text-xs text-slate-400 uppercase">Minutos/Pieza</label><input type="number" value={config.timePerPiece} onChange={e => setConfig({...config, timePerPiece: e.target.value})} className="w-full bg-slate-900 border border-slate-600 p-3 rounded text-white" /></div>
            <div><label className="text-xs text-slate-400 uppercase">Peso/Pieza (g)</label><input type="number" value={config.pieceWeightGrams} onChange={e => setConfig({...config, pieceWeightGrams: e.target.value})} className="w-full bg-slate-900 border border-slate-600 p-3 rounded text-white" /></div>
            <div><label className="text-xs text-slate-400 uppercase">Fecha Inicio</label><input type="date" value={config.startDate} onChange={e => setConfig({...config, startDate: e.target.value})} className="w-full bg-slate-900 border border-slate-600 p-3 rounded text-white" /></div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4 fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col border border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                    <span className="font-bold text-white uppercase">Gestión de Producción</span>
                    <button onClick={onClose}><i data-lucide="x" className="text-slate-400 w-6 h-6"></i></button>
                </div>
                <div className="flex-1 p-6 overflow-hidden">
                    {viewMode === 'list' ? (
                        <div className="h-full flex flex-col">
                            <div className="flex justify-between mb-4"><h2 className="text-xl font-bold">Pedidos Activos</h2><button onClick={handleStartCreate} className="bg-blue-600 px-4 py-2 rounded text-white font-bold">Nuevo</button></div>
                            <div className="flex-1 overflow-y-auto space-y-3">
                                {MACHINES.filter(m => ordersData[m.id]?.totalQty > 0 || (ordersData[m.id]?.parts?.length > 0)).map(m => {
                                    const order = ordersData[m.id];
                                    const metrics = calculateOrderMetrics(m.id, order, allProductionData, allRows, hiddenDays);
                                    const isComp = !!order.parts?.length;
                                    return (
                                        <div key={m.id} className="bg-slate-900 p-4 rounded border border-slate-700">
                                            <div className="flex justify-between">
                                                <div>
                                                    <span className="text-blue-400 font-bold">{m.name}</span>
                                                    <h4 className="text-lg font-black text-yellow-400">{order.model} {isComp && <span className="text-[10px] bg-slate-700 text-white px-1 rounded ml-2">MULTIEX</span>}</h4>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-xs font-bold text-slate-400">Avance</span>
                                                    <span className="text-lg font-bold text-white">{metrics.progress.toFixed(0)}%</span>
                                                </div>
                                            </div>
                                            {isComp && metrics.activePart && <div className="mt-2 text-xs text-green-400 font-bold">Trabajando: {metrics.activePart.name}</div>}
                                            <div className="flex gap-2 mt-3 justify-end">
                                                <button onClick={() => { setReportConfig({ machineId: m.id, order, metrics }); setShowReportModal(true); }} className="p-2 bg-slate-800 text-green-400 rounded"><i data-lucide="file-text" className="w-4 h-4"></i></button>
                                                <button onClick={() => handleStartEdit(m.id, order)} className="p-2 bg-slate-800 text-blue-400 rounded"><i data-lucide="pencil" className="w-4 h-4"></i></button>
                                                <button onClick={() => handleDeleteOrder(m.id)} className="p-2 bg-slate-800 text-red-400 rounded"><i data-lucide="trash-2" className="w-4 h-4"></i></button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            {showReportModal && reportConfig && <ReportModal onClose={() => setShowReportModal(false)} {...reportConfig} orderManagerRef={ref} />}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="flex justify-between mb-6 px-2">
                                {[1,2,3,4,5,6].map(s => <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500'}`}>{s}</div>)}
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
                                {step === 1 && (
                                    <div className="space-y-4">
                                        <h3 className="text-xl font-bold text-white text-center mb-6">Modelo</h3>
                                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                                            <label className="block text-blue-400 font-bold uppercase text-xs mb-2">Nombre del Modelo</label>
                                            <input type="text" value={modelName} onChange={e => setModelName(e.target.value.toUpperCase())} className="w-full bg-slate-900 text-2xl font-black text-white p-4 rounded-lg outline-none text-center uppercase" autoFocus />
                                        </div>
                                    </div>
                                )}
                                {step === 2 && (
                                    <div className="grid grid-cols-4 gap-4">
                                        {MACHINES.map(m => (
                                            <button key={m.id} onClick={() => toggleMachine(m.id)} className={`w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 ${selectedMachines.includes(m.id) ? 'bg-green-600 border-green-400' : 'bg-slate-800 border-slate-600'}`}>
                                                <span className="text-[10px] font-black text-white">{m.name.replace('MAQ ','')}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {step === 3 && (
                                    <div>
                                        <div className="flex justify-center mb-6">
                                            <div className="bg-slate-700 p-1 rounded-lg flex">
                                                <button onClick={() => setIsComposite(false)} className={`px-4 py-2 rounded-md text-xs font-bold ${!isComposite ? 'bg-blue-600 text-white shadow' : 'text-slate-300'}`}>Simple</button>
                                                <button onClick={() => setIsComposite(true)} className={`px-4 py-2 rounded-md text-xs font-bold ${isComposite ? 'bg-blue-600 text-white shadow' : 'text-slate-300'}`}>Compuesto</button>
                                            </div>
                                        </div>
                                        {isComposite ? renderPartsConfig() : renderSimpleConfig()}
                                    </div>
                                )}
                                {step === 4 && <div className="text-center text-slate-400 mt-10">Planeación Automática (Vista previa no disponible en edición rápida)</div>}
                                {step === 5 && (
                                    <div className="space-y-4">
                                         <h3 className="text-xl font-bold text-white text-center">Materiales (Englobado)</h3>
                                         {config.materials.map((m, i) => (
                                             <div key={i} className="flex gap-2">
                                                 <input value={m.name} onChange={e => {const n=[...config.materials]; n[i].name=e.target.value.toUpperCase(); setConfig({...config, materials:n})}} className="bg-slate-900 text-white p-2 rounded flex-1 uppercase" placeholder="Material" />
                                                 <input type="number" value={m.percentage} onChange={e => {const n=[...config.materials]; n[i].percentage=e.target.value; setConfig({...config, materials:n})}} className="bg-slate-900 text-white p-2 rounded w-20 text-center" placeholder="%" />
                                             </div>
                                         ))}
                                         <div className="flex justify-center gap-2 mt-4">
                                             {[0,5,10].map(w => <button key={w} onClick={() => setConfig({...config, wastePercentage: w})} className={`px-4 py-2 border rounded ${config.wastePercentage===w ? 'bg-green-600 text-white' : 'text-slate-400'}`}>{w}% Merma</button>)}
                                         </div>
                                    </div>
                                )}
                                {step === 6 && (
                                    <div className="text-center">
                                        <h3 className="text-xl font-bold text-white">Confirmar</h3>
                                        <div className="mt-4 p-4 bg-slate-900 rounded border border-slate-700">
                                            <p className="text-yellow-400 text-lg font-bold">{modelName}</p>
                                            {isComposite ? <p className="text-sm text-slate-400">{parts.length} Partes definidas</p> : <p className="text-sm text-slate-400">{config.totalQty} piezas</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between">
                                <button onClick={() => step > 1 ? setStep(s => s - 1) : setViewMode('list')} className="px-4 py-2 bg-slate-700 text-white rounded">Atrás</button>
                                <button onClick={() => step < 6 ? (validateStep(step) && setStep(s => s + 1)) : handleFinalSave()} className="px-6 py-2 bg-green-600 text-white font-bold rounded">
                                    {step === 6 ? 'Guardar' : 'Siguiente'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
