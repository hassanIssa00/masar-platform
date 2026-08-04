'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  getLocalWaitlist,
  createWaitlistEntry,
  updateWaitlistEntry,
  deleteWaitlistEntry,
  WaitlistRecord,
  WaitlistStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  PIPELINE_STAGES
} from '@/lib/waitlist';
import {
  Users, Plus, X, Phone, MessageSquare, ChevronRight,
  Trash2, Edit3, Calendar, AlertCircle, TrendingUp, Filter, Search, ArrowRight, CheckCircle2,
  ChevronLeft
} from 'lucide-react';

export default function WaitlistPage() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [leads, setLeads] = useState<WaitlistRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<WaitlistRecord | null>(null);

  // Form state
  const [childName, setChildName] = useState('');
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [concern, setConcern] = useState('');
  const [source, setSource] = useState<WaitlistRecord['source']>('whatsapp');
  const [priority, setPriority] = useState<WaitlistRecord['priority']>('medium');
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = () => {
    setLeads(getLocalWaitlist());
  };

  const openModal = (lead?: WaitlistRecord) => {
    if (lead) {
      setEditingLead(lead);
      setChildName(lead.childName);
      setParentName(lead.parentName);
      setPhone(lead.phone);
      setAge(lead.age);
      setConcern(lead.concern);
      setSource(lead.source);
      setPriority(lead.priority);
      setNextFollowUp(lead.nextFollowUp || '');
      setNotes(lead.notes);
    } else {
      setEditingLead(null);
      setChildName('');
      setParentName('');
      setPhone('');
      setAge('');
      setConcern('');
      setSource('whatsapp');
      setPriority('medium');
      setNextFollowUp('');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const saveLead = async () => {
    if (!childName || !parentName || !phone || !age) {
      alert('يرجى تعبئة الحقول الأساسية (اسم الطفل، اسم ولي الأمر، الجوال، العمر)');
      return;
    }

    const payload = {
      childName,
      parentName,
      phone,
      age: Number(age),
      concern,
      source,
      priority,
      status: editingLead ? editingLead.status : 'new-lead' as WaitlistStatus,
      nextFollowUp,
      notes,
    };

    if (editingLead) {
      updateWaitlistEntry(editingLead.id, payload);
    } else {
      await createWaitlistEntry(payload);
    }

    loadLeads();
    closeModal();
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا العميل؟')) {
      deleteWaitlistEntry(id);
      loadLeads();
    }
  };

  const advanceStatus = (lead: WaitlistRecord) => {
    const currentIndex = PIPELINE_STAGES.indexOf(lead.status);
    if (currentIndex < PIPELINE_STAGES.length - 1) {
      updateWaitlistEntry(lead.id, { status: PIPELINE_STAGES[currentIndex + 1] });
      loadLeads();
    }
  };

  const retreatStatus = (lead: WaitlistRecord) => {
    const currentIndex = PIPELINE_STAGES.indexOf(lead.status);
    if (currentIndex > 0) {
      updateWaitlistEntry(lead.id, { status: PIPELINE_STAGES[currentIndex - 1] });
      loadLeads();
    }
  };

  // Stats calculation
  const totalLeads = leads.length;
  const converted = leads.filter(l => l.status === 'in-sessions' || l.status === 'completed').length;
  const pending = leads.filter(l => ['new-lead', 'contacted', 'assessment-scheduled'].includes(l.status)).length;
  const conversionRate = totalLeads === 0 ? 0 : Math.round((converted / totalLeads) * 100);

  // Filtering
  const filteredLeads = leads.filter(l => 
    l.childName.includes(searchQuery) || 
    l.parentName.includes(searchQuery) || 
    l.phone.includes(searchQuery)
  );

  const getDaysInPipeline = (createdAt: string) => {
    const createdDate = new Date(createdAt);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - createdDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-rose-100 text-rose-800';
      case 'medium': return 'bg-amber-100 text-amber-800';
      case 'low': return 'bg-slate-100 text-slate-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <Users className="w-8 h-8 text-teal-600" />
                  قائمة الانتظار وإدارة العملاء
                </h1>
                <p className="text-gray-500 font-bold mt-1">تتبع رحلة العميل من التسجيل حتى بدء الجلسات</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-gray-200 p-1 rounded-lg flex items-center">
                  <button 
                    onClick={() => setViewMode('kanban')}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-teal-700' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    اللوحة
                  </button>
                  <button 
                    onClick={() => setViewMode('list')}
                    className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-teal-700' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    القائمة
                  </button>
                </div>
                
                <button
                  onClick={() => openModal()}
                  className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  إضافة عميل جديد
                </button>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500">إجمالي العملاء</p>
                  <p className="text-2xl font-black text-gray-900">{totalLeads}</p>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500">تم التحويل</p>
                  <p className="text-2xl font-black text-gray-900">{converted}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500">قيد الانتظار</p>
                  <p className="text-2xl font-black text-gray-900">{pending}</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-500">نسبة التحويل</p>
                  <p className="text-2xl font-black text-gray-900">{conversionRate}%</p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث باسم الطفل، ولي الأمر، أو رقم الجوال..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                />
              </div>
            </div>

            {/* Kanban View */}
            {viewMode === 'kanban' && (
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
                {PIPELINE_STAGES.map((stage) => {
                  const stageLeads = filteredLeads.filter(l => l.status === stage);
                  
                  return (
                    <div key={stage} className="min-w-[320px] w-[320px] shrink-0 bg-gray-100/50 rounded-xl p-4 flex flex-col snap-start">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-gray-800 flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[stage].split(' ')[0]}`}></span>
                          {STATUS_LABELS[stage] || stage}
                        </h3>
                        <span className="bg-gray-200 text-gray-700 text-xs font-bold px-2.5 py-1 rounded-full">
                          {stageLeads.length}
                        </span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[500px]">
                        {stageLeads.length === 0 ? (
                          <div className="h-32 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                            <p className="font-bold text-sm">لا يوجد عملاء هنا</p>
                          </div>
                        ) : (
                          stageLeads.map(lead => (
                            <div key={lead.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-black text-gray-900 truncate">{lead.childName}</h4>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => openModal(lead)} className="text-gray-400 hover:text-teal-600 p-1">
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              
                              <p className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {lead.parentName}
                              </p>
                              
                              <div className="flex flex-wrap gap-2 mb-3">
                                <span className={`text-xs px-2 py-1 rounded-md font-bold ${getPriorityColor(lead.priority)}`}>
                                  {lead.priority === 'high' ? 'عالي' : lead.priority === 'medium' ? 'متوسط' : 'منخفض'}
                                </span>
                                <span className="text-xs px-2 py-1 rounded-md font-bold bg-gray-100 text-gray-700">
                                  {lead.source}
                                </span>
                                <span className="text-xs px-2 py-1 rounded-md font-bold bg-blue-50 text-blue-700 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {getDaysInPipeline(lead.createdAt)} يوم
                                </span>
                              </div>
                              
                              <p className="text-xs text-gray-500 font-bold line-clamp-2 mb-4">
                                {lead.concern}
                              </p>
                              
                              <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-auto">
                                <div className="flex items-center gap-2">
                                  <a href={`tel:${lead.phone}`} className="text-gray-400 hover:text-teal-600 p-1 bg-gray-50 rounded-md">
                                    <Phone className="w-4 h-4" />
                                  </a>
                                  <a href={`https://wa.me/${lead.phone}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-green-600 p-1 bg-gray-50 rounded-md">
                                    <MessageSquare className="w-4 h-4" />
                                  </a>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  {PIPELINE_STAGES.indexOf(lead.status) > 0 && (
                                    <button
                                      onClick={() => retreatStatus(lead)}
                                      className="text-gray-400 hover:text-teal-600 p-1 bg-gray-50 rounded-md"
                                      title="المرحلة السابقة"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  )}
                                  {PIPELINE_STAGES.indexOf(lead.status) < PIPELINE_STAGES.length - 1 && (
                                    <button
                                      onClick={() => advanceStatus(lead)}
                                      className="text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2 py-1 rounded-md flex items-center gap-1 transition-colors"
                                    >
                                      التالي
                                      <ChevronLeft className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="p-4 font-black text-gray-600 text-sm">اسم الطفل</th>
                        <th className="p-4 font-black text-gray-600 text-sm">ولي الأمر</th>
                        <th className="p-4 font-black text-gray-600 text-sm">التواصل</th>
                        <th className="p-4 font-black text-gray-600 text-sm">الحالة</th>
                        <th className="p-4 font-black text-gray-600 text-sm">الأولوية</th>
                        <th className="p-4 font-black text-gray-600 text-sm">تاريخ الإضافة</th>
                        <th className="p-4 font-black text-gray-600 text-sm">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLeads.map(lead => (
                        <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4">
                            <div className="font-black text-gray-900">{lead.childName}</div>
                            <div className="text-xs text-gray-500 font-bold">{lead.age} سنوات</div>
                          </td>
                          <td className="p-4 font-bold text-gray-700">{lead.parentName}</td>
                          <td className="p-4">
                            <div className="font-bold text-gray-700">{lead.phone}</div>
                            <div className="text-xs text-gray-500">{lead.source}</div>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[lead.status]}`}>
                              {STATUS_LABELS[lead.status] || lead.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold ${getPriorityColor(lead.priority)}`}>
                               {lead.priority === 'high' ? 'عالي' : lead.priority === 'medium' ? 'متوسط' : 'منخفض'}
                            </span>
                          </td>
                          <td className="p-4 text-sm font-bold text-gray-600">
                            {new Date(lead.createdAt).toLocaleDateString('ar-SA')}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button onClick={() => openModal(lead)} className="text-gray-400 hover:text-teal-600 p-2 rounded-lg hover:bg-teal-50 transition-colors">
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(lead.id)} className="text-gray-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-500 font-bold">
                            لا يوجد عملاء مطابقين للبحث
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
          </div>
        </main>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-black text-gray-900">
                {editingLead ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">اسم الطفل *</label>
                    <input 
                      type="text" 
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">عمر الطفل *</label>
                    <input 
                      type="number" 
                      value={age}
                      onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">اسم ولي الأمر *</label>
                    <input 
                      type="text" 
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">رقم الجوال *</label>
                    <input 
                      type="text" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      dir="ltr"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-right"
                    />
                  </div>
                </div>
                
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">ما المشكلة الرئيسية للطفل؟</label>
                    <textarea 
                      value={concern}
                      onChange={(e) => setConcern(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold resize-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">المصدر</label>
                      <select 
                        value={source}
                        onChange={(e) => setSource(e.target.value as any)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      >
                        <option value="whatsapp">واتساب</option>
                        <option value="phone">اتصال هاتفي</option>
                        <option value="referral">توصية</option>
                        <option value="website">الموقع الإلكتروني</option>
                        <option value="social-media">وسائل التواصل</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">الأولوية</label>
                      <select 
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                      >
                        <option value="high">عالية</option>
                        <option value="medium">متوسطة</option>
                        <option value="low">منخفضة</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">موعد المتابعة القادم (اختياري)</label>
                    <input 
                      type="date" 
                      value={nextFollowUp}
                      onChange={(e) => setNextFollowUp(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">ملاحظات إضافية</label>
                    <textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button 
                onClick={closeModal}
                className="px-6 py-2.5 text-gray-700 font-bold hover:bg-gray-200 rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={saveLead}
                className="px-6 py-2.5 bg-teal-600 text-white font-bold hover:bg-teal-700 rounded-lg shadow-sm transition-colors"
              >
                حفظ البيانات
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
