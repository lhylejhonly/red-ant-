/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, Clock, Award, AlertCircle, CalendarRange, UserCheck 
} from 'lucide-react';
import { Employee, ShiftLog } from '../types';

interface EmployeeManagerProps {
  employees: Employee[];
  shiftLogs: ShiftLog[];
  orders?: any[];
  currency: string;
  activeEmployeeId: string;
  onClockIn: (empId: string, startingCash: number, notes?: string) => Promise<any>;
  onClockOut: (empId: string, endingCash: number, actualEndingCash: number, notes?: string) => Promise<any>;
  onAddEmployee: (empData: any) => Promise<any>;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export default function EmployeeManager({
  employees, shiftLogs, orders = [], currency, activeEmployeeId,
  onClockIn, onClockOut, onAddEmployee, showToast
}: EmployeeManagerProps) {
  const [startingCash, setStartingCash] = useState(150);
  const [actualCashCounted, setActualCashCounted] = useState<number | ''>('');
  const [shiftNotes, setShiftNotes] = useState('');
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'Super Admin' | 'Admin' | 'Cashier' | 'Inventory Manager' | 'Accountant'>('Cashier');
  const [newSalary, setNewSalary] = useState(2500);

  const activeEmployee = employees.find(e => e.id === activeEmployeeId);
  const isOpenShiftActive = activeEmployee?.attendance === 'Present';

  // Find the current open shift for this employee
  const openShift = shiftLogs.find(s => s.employeeId === activeEmployeeId && !s.clockOutTime);

  // Calculate expected ending cash from real cash-method sales since clock-in
  const cashSalesSinceClockIn = openShift
    ? orders
        .filter((o: any) => {
          const afterClockIn = new Date(o.timestamp) >= new Date(openShift.clockInTime);
          const hasCash = o.payments?.some((p: any) => p.method === 'Cash');
          return o.status === 'Completed' && afterClockIn && hasCash;
        })
        .reduce((sum: number, o: any) => {
          const cashAmt = o.payments
            .filter((p: any) => p.method === 'Cash')
            .reduce((s: number, p: any) => s + p.amount, 0);
          return sum + cashAmt;
        }, 0)
    : 0;

  const expectedEndingCash = (openShift?.startingCash ?? startingCash) + cashSalesSinceClockIn;
  const variance = typeof actualCashCounted === 'number' ? actualCashCounted - expectedEndingCash : 0;

  const handleClockToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEmployeeId) return;
    try {
      if (!isOpenShiftActive) {
        await onClockIn(activeEmployeeId, startingCash, shiftNotes || 'Shift Opened');
        showToast(`Clocked in. Starting float: ${currency}${startingCash}`, 'success');
      } else {
        const counted = typeof actualCashCounted === 'number' ? actualCashCounted : expectedEndingCash;
        await onClockOut(activeEmployeeId, expectedEndingCash, counted, shiftNotes || 'Shift Closed');
        if (variance !== 0) {
          showToast(`Clocked out. Cash variance: ${currency}${variance.toFixed(2)}`, 'info');
        } else {
          showToast('Clocked out. Drawer balanced perfectly!', 'success');
        }
      }
      setShiftNotes('');
      setActualCashCounted('');
    } catch {
      showToast('Error recording shift event.', 'error');
    }
  };

  const handleAddEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) { showToast('Name and Email are required.', 'error'); return; }
    try {
      await onAddEmployee({ name: newName, email: newEmail, phone: newPhone, role: newRole, monthlySalary: newSalary });
      showToast(`${newName} added to roster. Default PIN: 1234.`, 'success');
      setNewName(''); setNewEmail(''); setNewPhone(''); setNewSalary(2500);
      setIsAddingEmployee(false);
    } catch {
      showToast('Error registering employee.', 'error');
    }
  };

  const presentCount = employees.filter(e => e.attendance === 'Present').length;
  const totalPayroll = employees.reduce((sum, e) => sum + e.monthlySalary, 0);
  const avgScore = employees.length > 0
    ? employees.reduce((sum, e) => sum + e.performanceScore, 0) / employees.length
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">

      {/* LEFT: Shift Clock Panel */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-stone-100 pb-2">
            <div>
              <h4 className="text-sm font-bold text-stone-900">Terminal Shift Controller</h4>
              <p className="text-[10px] text-stone-500">Record cashier sessions and reconcile drawer cash</p>
            </div>
            <Clock className={`w-5 h-5 ${isOpenShiftActive ? 'text-emerald-700 animate-pulse' : 'text-stone-400'}`} />
          </div>

          {/* Active employee badge */}
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-800 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {activeEmployee?.name?.charAt(0) || '?'}
            </div>
            <div>
              <h5 className="text-xs font-bold text-stone-900">{activeEmployee?.name || 'Unknown'}</h5>
              <p className="text-[9px] text-stone-500">Role: <span className="font-semibold text-amber-800">{activeEmployee?.role}</span></p>
              <div className="flex items-center gap-1 mt-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isOpenShiftActive ? 'bg-emerald-500' : 'bg-stone-400'}`}></span>
                <span className="text-[9px] font-bold text-stone-600 uppercase">
                  {isOpenShiftActive ? 'ACTIVE SHIFT' : 'OFF DUTY'}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleClockToggle} className="space-y-3">
            {!isOpenShiftActive ? (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Starting Drawer Float ({currency})</label>
                <input
                  type="number"
                  value={startingCash}
                  onChange={(e) => setStartingCash(parseFloat(e.target.value) || 0)}
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none font-mono font-bold"
                  required
                />
                <p className="text-[9px] text-stone-400">Typical opening float: ₱150 – ₱5,000</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Show live cash breakdown */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-stone-500">
                    <span>Opening float</span>
                    <span className="font-mono">{currency}{(openShift?.startingCash ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Cash sales this shift</span>
                    <span className="font-mono">+{currency}{cashSalesSinceClockIn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-stone-900 border-t border-stone-200 pt-1.5 mt-1">
                    <span>Expected in drawer</span>
                    <span className="font-mono">{currency}{expectedEndingCash.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Actual Cash Counted ({currency})</label>
                  <input
                    type="number"
                    value={actualCashCounted}
                    onChange={(e) => setActualCashCounted(parseFloat(e.target.value) || 0)}
                    placeholder={expectedEndingCash.toFixed(2)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-mono font-bold text-stone-900"
                  />
                </div>

                {typeof actualCashCounted === 'number' && actualCashCounted !== expectedEndingCash && (
                  <div className={`p-2 rounded-lg border flex items-start gap-1.5 text-[10px] ${
                    variance < 0 ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800'
                  }`}>
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {variance < 0 ? 'Short' : 'Over'} by {currency}{Math.abs(variance).toFixed(2)} — will be logged in audit trail.
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-stone-500 uppercase">Shift Memo</label>
              <input
                type="text"
                placeholder={isOpenShiftActive ? 'All balanced...' : 'Opening Register 1...'}
                value={shiftNotes}
                onChange={(e) => setShiftNotes(e.target.value)}
                className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className={`w-full font-bold py-2.5 rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-1.5 ${
                isOpenShiftActive
                  ? 'bg-red-700 hover:bg-red-800 text-white'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white'
              }`}
            >
              {isOpenShiftActive ? 'Clock Out & Close Drawer' : 'Clock In & Open Drawer'}
            </button>
          </form>
        </div>

        {/* Shift log history */}
        <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
            <CalendarRange className="w-4 h-4 text-amber-800" /> Recent Shift Logs
          </h4>
          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {shiftLogs.length === 0 && (
              <p className="text-[10px] text-stone-400 text-center py-4">No shift records yet.</p>
            )}
            {shiftLogs.map(log => (
              <div key={log.id} className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-[10px] text-stone-600 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-stone-950">{log.employeeName}</span>
                  <span className="text-stone-400 font-mono">
                    {new Date(log.clockInTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} {new Date(log.clockInTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Float: {currency}{log.startingCash}</span>
                  {log.clockOutTime ? (
                    <span className={`font-semibold ${
                      log.actualEndingCash !== undefined && log.endingCash !== undefined && log.actualEndingCash !== log.endingCash
                        ? 'text-amber-700' : 'text-emerald-700'
                    }`}>
                      Counted: {currency}{log.actualEndingCash ?? '—'}
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold animate-pulse">Live</span>
                  )}
                </div>
                {log.notes && <p className="text-[9px] text-stone-400 italic">{log.notes}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Roster & Payroll */}
      <div className="lg:col-span-7 space-y-6">

        {/* Payroll summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm text-center">
            <span className="text-[9px] text-stone-500 uppercase font-bold">Monthly Payroll</span>
            <h4 className="text-lg font-black text-stone-950 mt-1">{currency}{totalPayroll.toLocaleString()}</h4>
            <p className="text-[9px] text-stone-400 mt-0.5">{employees.length} staff</p>
          </div>
          <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm text-center">
            <span className="text-[9px] text-stone-500 uppercase font-bold">Attendance</span>
            <h4 className="text-lg font-black text-emerald-700 mt-1">
              {employees.length > 0 ? ((presentCount / employees.length) * 100).toFixed(0) : 0}%
            </h4>
            <p className="text-[9px] text-stone-400 mt-0.5">{presentCount} present</p>
          </div>
          <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm text-center">
            <span className="text-[9px] text-stone-500 uppercase font-bold">Avg. Score</span>
            <h4 className="text-lg font-black text-amber-900 mt-1">{avgScore.toFixed(1)}%</h4>
            <p className="text-[9px] text-stone-400 mt-0.5">performance</p>
          </div>
        </div>

        {/* Roster table */}
        <div className="bg-white border border-stone-200 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-stone-100 pb-2">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-800" />
              <h4 className="text-sm font-bold text-stone-900">Employee Roster</h4>
            </div>
            <button
              onClick={() => setIsAddingEmployee(true)}
              className="bg-stone-900 hover:bg-stone-800 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] transition"
            >
              + Add Employee
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-600">
              <thead>
                <tr className="border-b border-stone-100 text-[10px] uppercase font-bold text-stone-400">
                  <th className="py-2">Name</th>
                  <th className="py-2">Role</th>
                  <th className="py-2 text-center">Status</th>
                  <th className="py-2 text-right">Salary</th>
                  <th className="py-2 text-center">Score</th>
                  <th className="py-2 text-right">Last Clock-In</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="py-2.5 font-semibold text-stone-900">{emp.name}</td>
                    <td className="py-2.5 text-stone-500 text-[10px]">{emp.role}</td>
                    <td className="py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        emp.attendance === 'Present' ? 'bg-emerald-50 text-emerald-700' :
                        emp.attendance === 'Late' ? 'bg-orange-50 text-orange-700' :
                        'bg-stone-100 text-stone-500'
                      }`}>
                        {emp.attendance}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-mono text-stone-700">{currency}{emp.monthlySalary.toLocaleString()}</td>
                    <td className="py-2.5 text-center font-mono font-bold text-amber-800">{emp.performanceScore}%</td>
                    <td className="py-2.5 text-right text-[10px] text-stone-400 font-mono">
                      {emp.lastClockIn
                        ? new Date(emp.lastClockIn).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-stone-400 text-xs">No employees registered.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ADD EMPLOYEE MODAL */}
      {isAddingEmployee && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-stone-200 max-w-sm w-full overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
              <h4 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-800" /> Register Personnel
              </h4>
              <button onClick={() => setIsAddingEmployee(false)} className="text-stone-400 hover:text-stone-950">×</button>
            </div>
            <form onSubmit={handleAddEmployeeSubmit} className="p-4 space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Full Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Juan dela Cruz"
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Email</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="juan@redantstore.com"
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-stone-500 uppercase">Phone</label>
                <input type="text" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+63 917 111 2222"
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Role</label>
                  <select value={newRole} onChange={(e: any) => setNewRole(e.target.value)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                    <option>Super Admin</option><option>Admin</option><option>Cashier</option>
                    <option>Inventory Manager</option><option>Accountant</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Salary ({currency})</label>
                  <input type="number" value={newSalary} onChange={(e) => setNewSalary(parseInt(e.target.value) || 0)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none font-mono" />
                </div>
              </div>
              <button type="submit"
                className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-2 rounded-xl text-xs transition mt-2">
                Create Account
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
