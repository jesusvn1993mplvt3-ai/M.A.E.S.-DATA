import { signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { collection, doc, setDoc, deleteDoc, onSnapshot, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { auth, db } from './firebase.js';
import { ROLES, DEFAULT_USERS, MACHINES } from './constants.js';
import { generateCalendar, calculateOrderMetrics, getWeekLabel } from './utils.js';
import { LoginScreen, ProductionSlot, UserManagementModal, ReportModal, VisibilityModal, CalendarModal } from './components.js';
import { OrderManager } from './OrderManager.js';

const { useState, useEffect, useMemo } = React;

const ALL_ROWS = generateCalendar();
const INITIAL_STATE = (() => {
    const todayISO = new Date().toISOString().split('T')[0];
    const foundIndex = ALL_ROWS.findIndex(r => r.isoDate === todayISO);
    const safeIndex = foundIndex !== -1 ? foundIndex : 0;
    return { weekOffset: Math.floor(safeIndex / 7), selectedDayIndex: safeIndex % 7 };
})();

const App = () => {
    const [user, setUser] = useState(null);
    const [usersData, setUsersData] = useState(DEFAULT_USERS); 
    const [data, setData] = useState({});
    const [ordersData, setOrdersData] = useState({});
    const [visibilityConfig, setVisibilityConfig] = useState({ machines: [], days: [] });
    const [loading, setLoading] = useState(true);
    const [weekOffset, setWeekOffset] = useState(INITIAL_STATE.weekOffset);
    const [selectedDayIndex, setSelectedDayIndex] = useState(INITIAL_STATE.selectedDayIndex); 
    const [showOrderManager, setShowOrderManager] = useState(false);
    const [showVisibilityModal, setShowVisibilityModal] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [showUserManagementModal, setShowUserManagementModal] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const orderManagerRef = React.useRef(); 

    useEffect(() => { if (window.lucide) window.lucide.createIcons(); });
    useEffect(() => { const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); }; window.addEventListener('beforeinstallprompt', handler); return () => window.removeEventListener('beforeinstallprompt', handler); }, []);
    
    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (u) => {
            if (u) {
                const unsubDb = onSnapshot(collection(db, 'produccion_2026'), (snap) => { const d = {}; snap.forEach(doc => d[doc.id] = doc.data()); setData(d); setLoading(false); });
                const unsubSettings = onSnapshot(doc(db, 'settings', 'visibility'), (docSnap) => { if (docSnap.exists()) setVisibilityConfig(docSnap.data()); });
                const unsubOrders = onSnapshot(doc(db, 'settings', 'orders'), (docSnap) => { if (docSnap.exists()) setOrdersData(docSnap.data()); });
                const unsubUsers = onSnapshot(doc(db, 'settings', 'users'), (docSnap) => { 
                    if (docSnap.exists()) { const fetchedUsers = docSnap.data(); setUsersData(fetchedUsers); if (user && !fetchedUsers[user.id]) setUser(null); } else { setDoc(doc(db, 'settings', 'users'), DEFAULT_USERS); }
                });
                return () => { unsubDb(); unsubSettings(); unsubOrders(); unsubUsers(); };
            } else signInAnonymously(auth);
        });
        return () => unsubAuth();
    }, [user]);

    const handleUpdateSlot = async (rowId, machineId, slotIndex, field, value) => {
        const currentMachineData = data[rowId]?.[machineId] || {};
        const currentSlots = currentMachineData.slots || [{}, {}, {}, {}];
        const updatedSlots = [...currentSlots];
        if (!updatedSlots[slotIndex]) updatedSlots[slotIndex] = {};
        if (field === 'qty') updatedSlots[slotIndex].qty = value === '' ? '' : Number(value);
        else updatedSlots[slotIndex].model = value;
        const newTotalActual = updatedSlots.reduce((acc, s) => acc + (Number(s?.qty) || 0), 0);
        const updatedMachine = { ...currentMachineData, slots: updatedSlots, actual: newTotalActual };
        await setDoc(doc(db, 'produccion_2026', rowId), { [machineId]: updatedMachine }, { merge: true });
    };

    const handleSaveOrder = async (machineId, orderData) => { await setDoc(doc(db, 'settings', 'orders'), { [machineId]: { ...orderData, lastUpdated: serverTimestamp(), updatedBy: user.name } }, { merge: true }); };
    const handleDeleteOrder = async (machineId) => { await setDoc(doc(db, 'settings', 'orders'), { [machineId]: { totalQty: 0, parts: [], lastUpdated: serverTimestamp() } }, { merge: true }); };
    const handleSaveVisibility = async (hiddenMachines, hiddenDays) => { await setDoc(doc(db, 'settings', 'visibility'), { machines: hiddenMachines, days: hiddenDays }, { merge: true }); };
    const handleSaveUser = async (pin, userData) => { try { await setDoc(doc(db, 'settings', 'users'), { ...usersData, [pin]: userData }); if (user.id === pin) setUser({...userData, id: pin}); alert('Usuario guardado'); } catch (error) { alert('Error: ' + error.message); } };
    const handleDeleteUser = async (pinToDelete) => { if (pinToDelete === user.id) return; if (confirm(`¿Eliminar ${pinToDelete}?`)) { const { [pinToDelete]: _, ...newUsers } = usersData; await setDoc(doc(db, 'settings', 'users'), newUsers); } };
    const handleDateSelect = (row) => { setWeekOffset(Math.floor(row.index / 7)); setShowCalendar(false); };

    const canViewGraph = user && (user.canViewGraph || user.role === ROLES.ADMIN || user.role === ROLES.DEVELOPMENT || user.role === ROLES.OBSERVER);
    const canManageUsers = user && user.role === ROLES.DEVELOPMENT; 
    const visibleMachines = useMemo(() => MACHINES.filter(m => !visibilityConfig.machines?.includes(m.id)), [visibilityConfig.machines]);
    const currentWeekRows = useMemo(() => { const start = weekOffset * 7; return ALL_ROWS.slice(start, start + 7); }, [weekOffset]);
    // Función auxiliar getWeekLabel debe ser importada o definida, para simplicidad la re-defino aquí si no la exportamos antes
    const getWeekLabelLocal = (weekRows) => {
            if (!weekRows || weekRows.length === 0) return '';
            const f = weekRows[0], l = weekRows[weekRows.length - 1];
            return f.month === l.month ? `${f.month} ${f.year}` : `${f.month} - ${l.month} ${l.year}`;
    };
    const weekLabel = useMemo(() => getWeekLabelLocal(currentWeekRows), [currentWeekRows]);
    const canManageOrders = user && (user.canManageOrders || user.role === ROLES.ADMIN || user.role === ROLES.DEVELOPMENT); 
    const canConfig = user && (user.role === ROLES.DEVELOPMENT); 
    const canEditSlot = (machineId, slotIndex) => { if (!user) return false; if (user.role === ROLES.ADMIN || user.role === ROLES.DEVELOPMENT) return true; if (user.allowedSlots) return user.allowedSlots.includes(slotIndex); return false; };

    if (!user) return <LoginScreen setAuthenticatedUser={setUser} installPrompt={deferredPrompt} onInstall={() => deferredPrompt?.prompt()} users={usersData} />;
    if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900"><i data-lucide="loader-2" className="animate-spin w-12 h-12 text-blue-500"></i></div>;

    const MobileView = () => {
        const safeIndex = selectedDayIndex >= currentWeekRows.length ? 0 : selectedDayIndex;
        const selectedDay = currentWeekRows[safeIndex];
        if (!selectedDay) return <div className="p-10 text-center text-slate-500">Semana sin días visibles</div>;
        const rowId = selectedDay.id;
        const dayData = data[rowId] || {};
        const isHiddenDay = visibilityConfig.days?.includes(rowId);
        
        return (
            <div className="flex flex-col h-full bg-slate-900">
                <div className="bg-slate-800 shadow-sm z-20 shrink-0 border-b border-slate-700">
                     <div className="p-3 flex justify-between items-center bg-slate-900/50"> 
                        <div className="flex items-center gap-2"><i data-lucide="user-check" className="w-5 h-5 text-blue-400"></i><div><p className="text-sm font-bold text-slate-100">{user.name.split(' ')[0]}</p><p className="text-[10px] text-slate-500 uppercase font-medium">{user.area}</p></div></div>
                        <div className="flex gap-2">
                            {canManageUsers && <button onClick={() => setShowUserManagementModal(true)} className="w-8 h-8 bg-yellow-600 rounded-lg flex items-center justify-center text-white"><i data-lucide="users" className="w-4 h-4"></i></button>}
                            {canManageOrders && <button onClick={() => setShowOrderManager(true)} className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white"><i data-lucide="clipboard-list" className="w-4 h-4"></i></button>}
                            {canConfig && <button onClick={() => setShowVisibilityModal(true)} className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-slate-300"><i data-lucide="settings" className="w-4 h-4"></i></button>}
                        </div>
                    </div>
                    <div className="flex overflow-x-auto custom-scrollbar pb-1 px-1 gap-1 bg-slate-900/50">{currentWeekRows.map((day, idx) => (<button key={day.id} onClick={() => setSelectedDayIndex(idx)} className={`flex-shrink-0 flex flex-col items-center justify-center p-2 min-w-[60px] rounded-lg my-2 transition-all ${idx === safeIndex ? 'bg-slate-700 shadow border-b-4 border-blue-500 scale-105' : 'text-slate-500 hover:bg-slate-800'}`}><span className="text-[10px] font-bold uppercase mb-0.5 text-blue-400">{day.shortDay}</span><span className={`text-lg font-black leading-none ${idx === safeIndex ? 'text-white' : 'text-slate-600'}`}>{day.dateNum}</span></button>))}</div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 pb-24 custom-scrollbar">
                    {isHiddenDay && <div className="p-4 bg-red-900/30 text-red-300 rounded-lg text-center font-bold mb-3">Día Oculto / Feriado</div>}
                    {visibleMachines.map(m => { 
                        const mData = dayData[m.id] || {};
                        const slots = mData.slots || [{}, {}, {}, {}];
                        const order = ordersData[m.id];
                        const metrics = calculateOrderMetrics(m.id, order, data, ALL_ROWS, visibilityConfig.days || []);
                        const isPlannedDay = metrics.isPlanned && new Date(order.startDate).toISOString().split('T')[0] <= selectedDay.isoDate && (metrics.finishDate === null || metrics.finishDate >= selectedDay.isoDate);
                        const isComposite = order?.parts?.length > 0;
                        
                        return (
                            <div key={m.id} className="bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-700 relative overflow-hidden mb-3">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center"><i data-lucide="cpu" className="w-5 h-5 opacity-50"></i></div><div><h3 className="font-black text-slate-200 text-sm">{m.name.replace('MAQ ','M-')}</h3><p className="text-[10px] text-slate-500 font-medium">{m.type}</p></div></div>
                                    {(metrics.progress > 0 || isPlannedDay) && <div className="text-[10px] font-bold text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">{metrics.progress.toFixed(0)}%</div>}
                                </div>
                                {order && (order.totalQty > 0 || isComposite) && canViewGraph && (
                                    <div className="mb-3">
                                        <div className="text-[10px] text-yellow-500 font-bold uppercase flex justify-between border-b border-slate-700 pb-1"><span>{order.model}</span><span>{isComposite ? 'MULTI' : order.totalQty}</span></div>
                                        {isComposite && metrics.activePart && <div className="text-[9px] text-green-400 mt-1">Prod: {metrics.activePart.name}</div>}
                                        <div className="h-1 w-full bg-slate-700 mt-1 rounded-full overflow-hidden"><div className="h-full bg-blue-500" style={{width: `${metrics.progress}%`}}></div></div>
                                    </div>
                                )}
                                <div className={`rounded-lg p-2 border border-slate-700/50 ${isPlannedDay && !isHiddenDay ? 'bg-yellow-900/10' : 'bg-slate-900/50'}`}>
                                    {isPlannedDay && !isHiddenDay && <div className="text-[8px] text-yellow-400 text-center font-bold uppercase mb-1">{order.model}</div>}
                                    <div className="grid grid-cols-2 gap-2 mb-1"><div className="text-[9px] text-center font-bold text-blue-400 uppercase tracking-widest border-b border-blue-900 pb-1">Andrés</div><div className="text-[9px] text-center font-bold text-orange-400 uppercase tracking-widest border-b border-orange-900 pb-1">Balta</div></div>
                                    <div className="grid grid-cols-2 gap-2 flex-1 h-16">{[0,1].map(idx => (<ProductionSlot key={idx} slotData={slots[idx]} index={idx} disabled={!canEditSlot(m.id, idx) || isHiddenDay} onUpdate={(idx, field, val) => handleUpdateSlot(rowId, m.id, idx, field, val)} />))}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="fixed bottom-0 left-0 w-full bg-slate-900/90 backdrop-blur border-t border-slate-700 p-3 flex justify-between items-center z-30">
                     <button onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))} className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400"><i data-lucide="chevron-left" className="w-5 h-5"></i></button>
                     <div className="text-center"><span className="block text-xs font-bold text-blue-400 uppercase tracking-wide">{weekLabel}</span></div>
                     <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400"><i data-lucide="chevron-right" className="w-5 h-5"></i></button>
                </div>
            </div>
        );
    };

    const DesktopView = () => (
        <div className="h-full flex flex-col bg-slate-900 overflow-hidden relative">
            <header className="bg-slate-800 shadow-sm border-b border-slate-700 p-3 flex justify-between items-center z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-2 rounded-lg text-white shadow-lg"><i data-lucide="factory" className="w-5 h-5"></i></div>
                    <h1 className="font-bold text-slate-200 hidden md:block">Control MAES - Tejido</h1>
                    <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-slate-700/50 ml-6">
                        <button onClick={() => setWeekOffset(prev => Math.max(0, prev - 1))} className="p-1 hover:bg-slate-700 rounded text-slate-400"><i data-lucide="chevron-left" className="w-5 h-5"></i></button>
                        <div className="flex items-center gap-2 px-2 cursor-pointer" onClick={() => setShowCalendar(true)}><i data-lucide="calendar" className="w-4 h-4 text-blue-400"></i><span className="text-sm font-bold text-white uppercase w-32 text-center select-none">{weekLabel}</span></div>
                        <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-1 hover:bg-slate-700 rounded text-slate-400"><i data-lucide="chevron-right" className="w-5 h-5"></i></button>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right px-3 py-1 bg-slate-900/50 rounded-lg border border-slate-700/50"><p className="text-sm font-bold text-blue-400">{user.name.toUpperCase()}</p><p className="text-[10px] text-slate-500 uppercase font-medium leading-none">{user.area}</p></div>
                    <div className="flex gap-2">
                        {canManageUsers && <button onClick={() => setShowUserManagementModal(true)} className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-2 shadow-lg transition-all"><i data-lucide="users" className="w-4 h-4"></i> Usuarios</button>}
                        {canManageOrders && <button onClick={() => setShowOrderManager(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-all"><i data-lucide="clipboard-list" className="w-4 h-4"></i> Pedidos</button>}
                        {canConfig && <button onClick={() => setShowVisibilityModal(true)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><i data-lucide="settings" className="w-5 h-5"></i></button>}
                        <button onClick={() => setUser(null)} className="p-2 text-red-400 hover:bg-red-900/20 rounded"><i data-lucide="log-out" className="w-5 h-5"></i></button>
                    </div>
                </div>
            </header>
            <main className="flex-1 overflow-auto p-2 custom-scrollbar relative">
                <div className="bg-slate-800 rounded-xl shadow border border-slate-700 overflow-hidden h-full">
                    <div className="overflow-auto custom-scrollbar h-full relative">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-20 bg-slate-900 shadow-sm border-b border-slate-700">
                                <tr>
                                    <th className="sticky left-0 z-30 bg-slate-900 p-3 min-w-[120px] text-left border-r border-slate-700 text-xs font-bold text-slate-500">FECHA</th>
                                    {visibleMachines.map(m => {
                                        const order = ordersData[m.id];
                                        const metrics = calculateOrderMetrics(m.id, order, data, ALL_ROWS, visibilityConfig.days || []);
                                        const isComp = order?.parts?.length > 0;
                                        return (
                                            <th key={m.id} className={`min-w-[160px] p-2 border-r border-slate-700 ${metrics.isPlanned ? 'bg-yellow-900/10' : ''}`}>
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs font-bold text-blue-400">{m.name.replace('MAQ ','')}</span>
                                                    {order && (order.totalQty > 0 || isComp) ? (
                                                        <div className="mt-1 w-full px-2">
                                                            <div className="flex justify-between items-center text-[9px] font-black text-yellow-400 uppercase leading-none mb-1"><span>{order.model}</span><span>{metrics.progress.toFixed(0)}%</span></div>
                                                            {canViewGraph && <div className="h-1 bg-slate-700 rounded-full overflow-hidden w-full"><div className="h-full bg-blue-500" style={{width: `${metrics.progress}%`}}></div></div>}
                                                            <span className="block text-[8px] text-slate-500 mt-1 font-bold">Fin: <span className={metrics.status === 'COMPLETADO' ? 'text-green-400' : 'text-red-400'}>{metrics.status === 'COMPLETADO' ? 'OK' : (metrics.finishDate || '-')}</span></span>
                                                        </div>
                                                    ) : <span className="text-[9px] text-slate-600">Sin Orden</span>}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {currentWeekRows.map(row => {
                                    const rowId = row.id; 
                                    const rowData = data[rowId] || {};
                                    const isHiddenDay = visibilityConfig.days?.includes(rowId);
                                    return (
                                        <tr key={rowId} className={`border-b border-slate-700 hover:bg-slate-700/50 transition-colors ${isHiddenDay ? 'opacity-30' : ''}`}>
                                            <td className="sticky left-0 bg-slate-800 p-2 border-r border-slate-700 text-xs font-bold text-slate-400 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">{row.shortDay} <br/> <span className="text-lg text-slate-200">{row.dateNum}</span></td>
                                            {visibleMachines.map(m => {
                                                const mData = rowData[m.id] || {}; 
                                                const slots = mData.slots || [{}, {}, {}, {}];
                                                const order = ordersData[m.id];
                                                const metrics = calculateOrderMetrics(m.id, order, data, ALL_ROWS, visibilityConfig.days || []);
                                                const isFinishDay = metrics.finishDate === row.isoDate && metrics.status !== 'COMPLETADO';
                                                const isPlannedDay = metrics.isPlanned && new Date(order.startDate).toISOString().split('T')[0] <= row.isoDate && (metrics.finishDate === null || metrics.finishDate >= row.isoDate);
                                                
                                                return (
                                                    <td key={m.id} className={`p-1 border-r border-slate-700 relative h-[80px] ${isFinishDay ? 'bg-red-900/30 border-red-500/50' : ''} ${isPlannedDay && !isHiddenDay ? 'bg-yellow-900/10' : ''}`}>
                                                        {isPlannedDay && !isHiddenDay && <div className="planning-info">{order.model}</div>}
                                                        <div className="flex flex-col h-full">
                                                            <div className="grid grid-cols-2 gap-1 mb-0.5"><div className="text-[8px] text-center text-blue-400 font-bold bg-slate-900/50 rounded">A</div><div className="text-[8px] text-center text-orange-400 font-bold bg-slate-900/50 rounded">B</div></div>
                                                            <div className="grid grid-cols-2 gap-1 flex-1">{[0,1].map(idx => (<ProductionSlot key={idx} slotData={slots[idx]} index={idx} disabled={!canEditSlot(m.id, idx) || isHiddenDay} onUpdate={(idx, field, val) => handleUpdateSlot(rowId, m.id, idx, field, val)} />))}</div>
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );

    return (
        <div className="h-full relative">
            {showOrderManager && <OrderManager ref={orderManagerRef} onClose={() => setShowOrderManager(false)} onSaveOrders={handleSaveOrder} onDeleteOrder={handleDeleteOrder} ordersData={ordersData} allProductionData={data} allRows={ALL_ROWS} hiddenDays={visibilityConfig.days} />}
            {showVisibilityModal && <VisibilityModal onClose={() => setShowVisibilityModal(false)} currentHiddenMachines={visibilityConfig.machines || []} currentHiddenDays={visibilityConfig.days || []} onSaveVisibility={handleSaveVisibility} allRows={ALL_ROWS} />}
            {showCalendar && <CalendarModal onClose={() => setShowCalendar(false)} onSelectDate={handleDateSelect} allRows={ALL_ROWS} />}
            {canManageUsers && showUserManagementModal && <UserManagementModal onClose={() => setShowUserManagementModal(false)} users={usersData} onSaveUser={handleSaveUser} onDeleteUser={handleDeleteUser} />}
            <div className="block md:hidden h-full"><MobileView /></div>
            <div className="hidden md:block h-full"><DesktopView /></div>
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
