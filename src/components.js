import { ROLES, MACHINES } from './constants.js';
import { calculateConsumptionDetails } from './utils.js';

const { useState, useEffect } = React;

export const ProductionSlot = ({ slotData, index, disabled, onUpdate }) => {
    const [localModel, setLocalModel] = useState(slotData?.model || '');
    const [localQty, setLocalQty] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (!isDirty) { 
            setLocalModel(slotData?.model || ''); 
            setLocalQty(slotData?.qty ?? ''); 
        }
    }, [slotData, isDirty]);

    const handleSave = (e) => {
        e?.preventDefault();
        if (localModel !== (slotData?.model || '')) onUpdate(index, 'model', localModel);
        if (String(localQty) !== String(slotData?.qty ?? '')) onUpdate(index, 'qty', localQty);
        setIsDirty(false);
    };

    const handleChange = (f, v) => { if (f==='model') setLocalModel(v); else setLocalQty(v); setIsDirty(true); };
    const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); e.target.blur(); } };

    return (
        <div className={`flex flex-col border border-slate-700/50 rounded overflow-hidden h-full relative ${disabled ? 'bg-slate-900/20 opacity-40' : 'bg-slate-800'} ${isDirty ? 'border-yellow-500/50' : ''}`}>
            <input type="text" placeholder="MOD" value={localModel} onChange={(e) => handleChange('model', e.target.value)} onKeyDown={handleKeyDown} disabled={disabled} className="slot-input text-[8px] text-yellow-500 uppercase border-b border-slate-700/50 h-1/2" />
            <input type="number" placeholder="CANT" value={localQty} onChange={(e) => handleChange('qty', e.target.value)} onKeyDown={handleKeyDown} disabled={disabled} className="slot-input text-[10px] text-white h-1/2" />
            {isDirty && !disabled && (<div className="absolute inset-y-0 right-0 w-8 flex items-center justify-center bg-gradient-to-l from-slate-900 via-slate-900/80 to-transparent z-10 animate-zoom-in"><button onClick={handleSave} className="bg-green-600 text-white rounded-full p-1 shadow-lg hover:scale-110"><i data-lucide="check" className="w-3 h-3"></i></button></div>)}
        </div>
    );
};

export const UserManagementModal = ({ onClose, users, onSaveUser, onDeleteUser }) => {
    const [editingUser, setEditingUser] = useState(null);
    const [pin, setPin] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState(ROLES.OPERATOR);
    const [area, setArea] = useState('');

    const allUsersArray = Object.entries(users).map(([pin, data]) => ({ pin, ...data }));

    const startEdit = (user) => {
        setEditingUser(user);
        setPin(user.pin);
        setName(user.name);
        setRole(user.role);
        setArea(user.area || '');
    };

    const handleSave = () => {
        if (!pin || !name || !role) { alert('Todos los campos son obligatorios'); return; }
        if (pin.length !== 4 || isNaN(Number(pin))) { alert('PIN debe ser 4 dígitos'); return; }
        
        const payload = { 
            name, role, area,
            canManageOrders: editingUser ? editingUser.canManageOrders : role === ROLES.ADMIN || role === ROLES.OBSERVER || role === ROLES.DEVELOPMENT,
            canViewGraph: editingUser ? editingUser.canViewGraph : role === ROLES.ADMIN || role === ROLES.OBSERVER || role === ROLES.DEVELOPMENT,
            canManageUsers: editingUser ? editingUser.canManageUsers : role === ROLES.DEVELOPMENT,
        };
        if (role === ROLES.OPERATOR) payload.allowedSlots = editingUser?.allowedSlots || [];

        onSaveUser(pin, payload);
        setEditingUser(null); setPin(''); setName(''); setRole(ROLES.OPERATOR); setArea('');
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col border border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 no-print">
                    <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2"><i data-lucide="users" className="w-5 h-5 text-yellow-400"></i> Gestión de Usuarios</h3>
                    <button onClick={onClose}><i data-lucide="x" className="text-slate-400 w-5 h-5"></i></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar flex gap-6">
                    <div className="w-1/3 shrink-0 bg-slate-900 p-4 rounded-xl border border-slate-700 h-fit sticky top-0">
                        <h4 className="text-lg font-bold text-white mb-4">{editingUser ? 'Editar' : 'Crear'}</h4>
                        <div className="space-y-3">
                            <input type="number" value={pin} onChange={e => setPin(e.target.value.slice(0, 4))} disabled={!!editingUser} placeholder="PIN" className="w-full bg-slate-700 text-white p-2 rounded" />
                            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nombre" className="w-full bg-slate-700 text-white p-2 rounded" />
                            <input type="text" value={area} onChange={e => setArea(e.target.value)} placeholder="Área" className="w-full bg-slate-700 text-white p-2 rounded" />
                            <select value={role} onChange={e => setRole(e.target.value)} className="w-full bg-slate-700 text-white p-2 rounded"><option value={ROLES.OPERATOR}>Operador</option><option value={ROLES.ADMIN}>Admin</option></select>
                        </div>
                        <button onClick={handleSave} className="mt-4 w-full bg-green-600 text-white py-2 rounded font-bold">Guardar</button>
                    </div>
                    <div className="flex-1 space-y-3">
                        {allUsersArray.map(u => (
                            <div key={u.pin} className="bg-slate-900 p-4 rounded border border-slate-700 flex justify-between items-center">
                                <div><p className="font-bold text-white">{u.name}</p><p className="text-sm text-blue-400">{u.role}</p></div>
                                <div className="flex gap-2"><button onClick={() => startEdit(u)} className="p-2 bg-slate-700 rounded"><i data-lucide="pencil" className="w-4 h-4 text-blue-400"></i></button><button onClick={() => onDeleteUser(u.pin)} className="p-2 bg-red-900/50 rounded"><i data-lucide="trash-2" className="w-4 h-4 text-red-400"></i></button></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ReportModal = ({ onClose, machineId, order, metrics, orderManagerRef }) => {
    if (!order || !machineId) return null;

    const machine = MACHINES.find(m => m.id === machineId);
    const isComposite = order.parts && order.parts.length > 0;
    const consumptionData = calculateConsumptionDetails(order, metrics.produced);
    const consumedKilosReal = isComposite ? metrics.totalYarnConsumed : consumptionData.producedYarnKilos;
    const totalRequiredKilos = isComposite ? (consumptionData.totalYarnKilos) : consumptionData.totalYarnKilos;
    
    const handleDownloadWord = () => {
        const reportContent = document.querySelector('.report-page').outerHTML;
        const htmlContent = `<html><head><meta charset="UTF-8"></head><body>${reportContent}</body></html>`;
        const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Reporte_${machine.name}_${order.model}.doc`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in no-print" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[95vh] flex flex-col border border-slate-700 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 no-print">
                    <h3 className="font-bold text-white uppercase tracking-wider text-sm">Reporte: {machine.name} - {order.model}</h3>
                    <div className="flex gap-2"><button onClick={() => window.print()} className="px-3 bg-red-600 rounded text-white font-bold">PDF</button><button onClick={handleDownloadWord} className="px-3 bg-blue-600 rounded text-white font-bold">DOC</button><button onClick={onClose}><i data-lucide="x" className="text-slate-400 w-5 h-5"></i></button></div>
                </div>
                <div className="flex-1 overflow-y-auto p-0 custom-scrollbar report-page">
                    <div className="report-header"><h1>REPORTE - {order.model} {isComposite ? '(COMPUESTO)' : ''}</h1></div>
                    <div className="report-section">
                        <h2>📋 Datos del Pedido</h2>
                        <div className="report-data">
                            <div><span className="report-label">Máquina:</span><span className="report-value">{machine.name}</span></div>
                            <div><span className="report-label">Modelo:</span><span className="report-value text-blue-700">{order.model}</span></div>
                            {!isComposite && <div><span className="report-label">Cantidad:</span><span className="report-value">{Number(order.totalQty).toLocaleString()} pzas</span></div>}
                            <div><span className="report-label">Inicio:</span><span className="report-value">{order.startDate}</span></div>
                            <div><span className="report-label">Fin Est.:</span><span className="report-value">{metrics.finishDate || 'Pendiente'}</span></div>
                        </div>
                    </div>
                    {isComposite && (
                        <div className="report-section">
                            <h2>🧩 Desglose de Partes</h2>
                            <table className="report-material-table">
                                <thead><tr><th>Parte</th><th>Total Req.</th><th>Producido</th><th>Faltante</th></tr></thead>
                                <tbody>
                                    {metrics.partsStatus.map((p, i) => (
                                        <tr key={i}>
                                            <td>{p.name}</td>
                                            <td>{p.qty}</td>
                                            <td className={p.produced >= p.qty ? 'text-green-600 font-bold' : ''}>{p.produced}</td>
                                            <td>{Math.max(0, p.qty - p.produced)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="report-section">
                        <h2>📈 Avance</h2>
                        <div className="report-data">
                            <div><span className="report-label">Progreso Global:</span><span className="report-value text-blue-700">{metrics.progress.toFixed(1)}%</span></div>
                            <div><span className="report-label">Desviación (Tiempo):</span><span className={metrics.deviation < 0 ? 'text-red-700' : 'text-green-700'}>{metrics.deviation} {isComposite ? 'Horas aprox' : 'Piezas'}</span></div>
                        </div>
                    </div>
                    <div className="report-section">
                        <h2>🧵 Consumo Hilo (Englobado)</h2>
                        <div className="report-data">
                            <div><span className="report-label">Merma:</span><span className="report-value text-red-700">{order.wastePercentage}%</span></div>
                            <div><span className="report-label">Total Requerido:</span><span className="report-value text-blue-700 text-lg">{totalRequiredKilos.toFixed(2)} KG</span></div>
                            <div><span className="report-label">Consumido (Estimado):</span><span className="report-value text-green-700 text-lg">{consumedKilosReal.toFixed(2)} KG</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const LoginScreen = ({ setAuthenticatedUser, installPrompt, onInstall, users }) => {
    const [pin, setPin] = useState('');
    const handleLogin = (e) => {
        e.preventDefault();
        const user = users[pin]; 
        if (user) setAuthenticatedUser({ ...user, id: pin }); 
        else alert('PIN incorrecto');
    };
    return (
        <div className="flex items-center justify-center h-full bg-slate-900 p-4">
            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center border border-slate-700 relative">
                <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg"><i data-lucide="grid" className="w-8 h-8"></i></div>
                <h2 className="text-2xl font-black text-white mb-2">MAES - TEJIDO</h2>
                <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                    <input type="tel" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="• • • •" className="w-full text-center text-4xl p-4 bg-slate-900 border-2 border-slate-700 rounded-xl tracking-[0.2em] focus:border-blue-500 outline-none font-bold text-white password-mask" autoFocus />
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-500 shadow-lg">INGRESAR</button>
                </form>
            </div>
        </div>
    );
};

export const VisibilityModal = ({ onClose, currentHiddenMachines, currentHiddenDays, onSaveVisibility, allRows }) => {
    const [hiddenM, setHiddenM] = useState([...currentHiddenMachines]);
    const [hiddenD, setHiddenD] = useState([...currentHiddenDays]);
    const [dateToHide, setDateToHide] = useState('');
    const toggleMachine = (mid) => { if (hiddenM.includes(mid)) setHiddenM(prev => prev.filter(id => id !== mid)); else setHiddenM(prev => [...prev, mid]); };
    const hideDate = () => { if (!dateToHide) return; const row = allRows.find(r => r.isoDate === dateToHide); if (row && !hiddenD.includes(row.id)) setHiddenD(prev => [...prev, row.id]); setDateToHide(''); };
    const unhideDate = (rowId) => { setHiddenD(prev => prev.filter(id => id !== rowId)) };
    const handleSave = () => { onSaveVisibility(hiddenM, hiddenD); onClose(); };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg h-[85vh] flex flex-col border border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 rounded-t-2xl"><h3 className="font-bold text-lg text-white">Configuración Global</h3><button onClick={onClose}><i data-lucide="x" className="text-slate-400 w-6 h-6"></i></button></div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
                    <div><h4 className="text-xs font-bold text-blue-400 uppercase mb-2">Visibilidad Máquinas</h4><div className="grid grid-cols-2 gap-2">{MACHINES.map(m => { const isHidden = hiddenM.includes(m.id); return (<button key={m.id} onClick={() => toggleMachine(m.id)} className={`flex items-center justify-between p-2 rounded border text-sm ${isHidden ? 'bg-red-900/30 border-red-500/50 text-red-300' : 'bg-slate-900 border-slate-700 text-slate-300'}`}><span>{m.name}</span>{isHidden ? <i data-lucide="eye-off" className="w-4 h-4"></i> : <i data-lucide="eye" className="w-4 h-4 text-green-500/50"></i>}</button>) })}</div></div>
                    <div><h4 className="text-xs font-bold text-blue-400 uppercase mb-2">Ocultar Días (Feriados Globales)</h4><div className="flex gap-2 mb-3"><input type="date" value={dateToHide} onChange={e => setDateToHide(e.target.value)} className="bg-slate-900 text-white border border-slate-600 rounded p-2 flex-1 text-sm" /><button onClick={hideDate} className="bg-slate-700 px-3 rounded text-white text-sm">Ocultar</button></div>{hiddenD.map(rid => (<div key={rid} className="flex justify-between items-center text-sm p-2 bg-slate-800 rounded mb-1"><span className="text-slate-300">{rid}</span><button onClick={() => unhideDate(rid)} className="text-red-400 text-xs font-bold">Mostrar</button></div>))}</div>
                </div>
                <div className="p-4 border-t border-slate-700 bg-slate-900 rounded-b-2xl"><button onClick={handleSave} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Guardar</button></div>
            </div>
        </div>
    )
};

export const CalendarModal = ({ onClose, onSelectDate, allRows }) => {
    const [viewDate, setViewDate] = useState(new Date()); 
    const handleMonthChange = (delta) => { const d = new Date(viewDate); d.setMonth(d.getMonth() + delta); setViewDate(d); };
    const monthRows = allRows.filter(r => r.monthIndex === viewDate.getMonth() && r.year === viewDate.getFullYear());
    const startDayOffset = ['DOM','LUN','MAR','MIE','JUE','VIE','SAB'].indexOf(monthRows[0]?.shortDay) || 0;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-700 p-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4"><button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-slate-700 rounded"><i data-lucide="chevron-left" className="text-white w-5 h-5"></i></button><span className="font-bold text-white uppercase">{viewDate.toLocaleString('es-MX', { month: 'long', year: 'numeric' })}</span><button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-slate-700 rounded"><i data-lucide="chevron-right" className="text-white w-5 h-5"></i></button></div>
                <div className="grid grid-cols-7 gap-1 text-center mb-2">{['D','L','M','M','J','V','S'].map((d,i) => <div key={i} className="text-xs text-slate-500 font-bold">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-1">{Array(startDayOffset).fill(null).map((_, i) => <div key={`b-${i}`}></div>)}{monthRows.map(row => (<button key={row.id} onClick={() => onSelectDate(row)} className="aspect-square flex items-center justify-center rounded-lg hover:bg-blue-600 bg-slate-900 text-slate-200 text-sm font-bold border border-slate-700">{row.dateNum}</button>))}</div>
                <button onClick={onClose} className="w-full mt-4 bg-slate-700 py-2 rounded-lg text-white font-bold text-sm">Cerrar</button>
            </div>
        </div>
    );
};
