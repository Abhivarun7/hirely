import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Ticket as TicketIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle as XCircleIcon,
  Lock,
  MessageSquare,
  Send,
  X,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Settings,
  Trash2,
  Plus,
} from 'lucide-react';
import * as adminApi from '../../api/admin';
import type {
  AdminTicketAttachment,
  TicketTemplate as ITicketTemplate,
} from '../../api/admin';
import { useAuthStore } from '@/store/authStore';
import { useTicketSocket } from '@/hooks/useTicketSocket';

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(
  /\/api\/v1\/?$/,
  ''
);

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

interface TicketSummary {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  createdByName: string;
  createdByEmail: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

interface TicketMessage {
  id: string;
  senderId: string;
  senderName?: string;
  senderEmail?: string;
  senderRole?: string;
  message?: string;
  attachments?: AdminTicketAttachment[];
  sentAt: string;
}

interface TicketDetail extends TicketSummary {
  messages: TicketMessage[];
}

const statusConfig: Record<TicketStatus, { label: string; color: string; Icon: typeof Clock }> = {
  open: { label: 'Open', color: 'bg-red-50 text-red-700 border-red-200', Icon: AlertCircle },
  in_progress: {
    label: 'In Progress',
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    Icon: Clock,
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-green-50 text-green-700 border-green-200',
    Icon: CheckCircle,
  },
  closed: { label: 'Closed', color: 'bg-gray-50 text-gray-700 border-gray-200', Icon: Lock },
};

function StatusPill({ status }: { status: TicketStatus }) {
  const cfg = statusConfig[status];
  const { Icon } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

function isImage(mime: string): boolean {
  return mime.startsWith('image/');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AttachmentChip({ a }: { a: AdminTicketAttachment }) {
  const fullUrl = a.url.startsWith('http') ? a.url : `${API_ORIGIN}${a.url}`;
  if (isImage(a.mime)) {
    return (
      <a href={fullUrl} target="_blank" rel="noreferrer" className="block">
        <img src={fullUrl} alt={a.filename} className="max-w-full max-h-48 rounded-lg border object-cover" />
      </a>
    );
  }
  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 bg-white/60 border rounded-lg text-sm hover:bg-white transition-colors"
    >
      <FileText className="w-4 h-4" />
      <span className="truncate max-w-[180px]">{a.filename}</span>
      <span className="text-xs opacity-70">{formatBytes(a.size)}</span>
    </a>
  );
}

function mapTicket(t: any): TicketSummary {
  const sb = t.submitted_by ?? {};
  return {
    id: t._id ?? t.id,
    subject: t.subject ?? '',
    description: t.description ?? '',
    status: (t.status as TicketStatus) ?? 'open',
    createdByName: sb.display_name ?? sb.email ?? 'User',
    createdByEmail: sb.email ?? '',
    assignedTo: t.assigned_to?.display_name ?? t.assigned_to?.email,
    createdAt: t.createdAt ?? '',
    updatedAt: t.updatedAt ?? '',
  };
}

function mapMessage(m: any): TicketMessage {
  const sender = m.sender_id ?? {};
  const senderId = typeof sender === 'string' ? sender : sender._id ?? sender.id ?? '';
  return {
    id: m._id ?? m.id,
    senderId,
    senderName: typeof sender === 'object' ? sender.display_name : undefined,
    senderEmail: typeof sender === 'object' ? sender.email : undefined,
    senderRole: typeof sender === 'object' ? sender.role : undefined,
    message: m.message,
    attachments: m.attachments,
    sentAt: m.sent_at ?? '',
  };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function Tickets() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [otherTyping, setOtherTyping] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ITicketTemplate[]>([]);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [showManageTemplates, setShowManageTemplates] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 10;

  const loadList = async () => {
    try {
      const res = await adminApi.getTickets({ page: 1, limit: 100 });
      const list: any[] = (res.data as any)?.data ?? res.data ?? [];
      setTickets(list.map(mapTicket));
    } catch {
      setTickets([]);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await adminApi.getTicketTemplates(true);
      const list = (res.data as any)?.data ?? [];
      setTemplates(Array.isArray(list) ? list : []);
    } catch {
      setTemplates([]);
    }
  };

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadList();
    loadTemplates();
  }, []);

  // Notification deep-link: /admin/tickets?id=<ticketId> opens the chat.
  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl && idFromUrl !== selectedId) {
      setSelectedId(idFromUrl);
      const next = new URLSearchParams(searchParams);
      next.delete('id');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    adminApi
      .getTicket(selectedId)
      .then((res) => {
        if (cancelled) return;
        const data = (res.data as any)?.data ?? res.data;
        if (!data) {
          setDetail(null);
          return;
        }
        setDetail({
          ...mapTicket(data),
          messages: (data.messages ?? []).map(mapMessage),
        });
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail?.messages?.length, otherTyping]);

  const { notifyTyping, connected: socketConnected } = useTicketSocket({
    ticketId: selectedId,
    onMessage: (msg) => {
      const mapped = mapMessage(msg);
      setDetail((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m.id === mapped.id)) return prev;
        return { ...prev, messages: [...prev.messages, mapped] };
      });
    },
    onStatus: (status) => {
      setDetail((prev) => (prev ? { ...prev, status: status as TicketStatus } : prev));
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedId ? { ...t, status: status as TicketStatus } : t))
      );
    },
    onTyping: (info) => {
      if (info.userId === user?.id) return;
      setOtherTyping(info.displayName ?? info.email ?? 'User');
    },
    onStoppedTyping: () => setOtherTyping(null),
  });

  const filteredTickets = tickets.filter((t) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      t.subject.toLowerCase().includes(term) ||
      (t.createdByName ?? '').toLowerCase().includes(term) ||
      (t.createdByEmail ?? '').toLowerCase().includes(term);
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / itemsPerPage));

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    const next = [...pendingFiles, ...Array.from(list)].slice(0, 5);
    setPendingFiles(next);
    e.target.value = '';
  };

  const removePending = (idx: number) => setPendingFiles((p) => p.filter((_, i) => i !== idx));

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    if (!reply.trim() && pendingFiles.length === 0) return;
    setSending(true);
    try {
      let attachments: AdminTicketAttachment[] | undefined;
      if (pendingFiles.length > 0) {
        const upRes = await adminApi.uploadTicketAttachments(selectedId, pendingFiles);
        attachments = (upRes.data as any)?.data ?? [];
      }
      const replyRes = await adminApi.replyTicket(selectedId, {
        message: reply.trim() || undefined,
        attachments,
      });
      const saved = (replyRes.data as any)?.data;
      if (saved) {
        const mapped = mapMessage({
          ...saved,
          sender_id: { _id: user?.id, email: user?.email, role: user?.role },
        });
        setDetail((prev) => {
          if (!prev) return prev;
          if (prev.messages.some((m) => m.id === mapped.id)) return prev;
          return { ...prev, messages: [...prev.messages, mapped] };
        });
      }
      setReply('');
      setPendingFiles([]);
      // Refresh list ordering; the socket echo (if it arrives) is deduped by id.
      loadList().catch(() => {});
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (next: TicketStatus) => {
    if (!selectedId || !detail) return;
    if (next === detail.status) return;
    try {
      await adminApi.updateTicketStatus(selectedId, next);
      // Optimistic; socket will also push.
      setDetail({ ...detail, status: next });
      await loadList();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to update status');
    }
  };

  const handleAssignToSelf = async () => {
    if (!selectedId || !user?.id) return;
    try {
      await adminApi.assignTicket(selectedId, user.id);
      const refresh = await adminApi.getTicket(selectedId);
      const data = (refresh.data as any)?.data;
      if (data) {
        setDetail({
          ...mapTicket(data),
          messages: (data.messages ?? []).map(mapMessage),
        });
      }
      await loadList();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to assign');
    }
  };

  const isMyMessage = (m: TicketMessage) => m.senderId === user?.id;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-600 mt-1">Respond to user-submitted tickets and resolve them.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowManageTemplates(true)}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white rounded-xl text-sm font-medium hover:bg-gray-50"
          >
            <Settings className="w-4 h-4" />
            Templates
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: tickets.length, status: 'all' },
          { label: 'Open', value: tickets.filter((t) => t.status === 'open').length, status: 'open' },
          {
            label: 'In Progress',
            value: tickets.filter((t) => t.status === 'in_progress').length,
            status: 'in_progress',
          },
          {
            label: 'Resolved',
            value: tickets.filter((t) => t.status === 'resolved').length,
            status: 'resolved',
          },
          { label: 'Closed', value: tickets.filter((t) => t.status === 'closed').length, status: 'closed' },
        ].map((stat) => (
          <button
            key={stat.label}
            onClick={() => {
              setStatusFilter(stat.status);
              setCurrentPage(1);
            }}
            className={`p-4 rounded-xl border transition-all ${
              statusFilter === stat.status
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </button>
        ))}
      </motion.div>

      {/* List */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="divide-y divide-gray-50">
          {paginatedTickets.length === 0 && (
            <p className="p-8 text-center text-sm text-gray-500">No tickets match the filter.</p>
          )}
          {paginatedTickets.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setSelectedId(t.id)}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <TicketIcon className="w-6 h-6 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{t.subject}</h3>
                    <StatusPill status={t.status} />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {t.createdByName}
                    {t.createdByEmail && t.createdByEmail !== t.createdByName && (
                      <span className="ml-1.5 text-gray-400">· {t.createdByEmail}</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-1">{t.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}
                    </span>
                    {t.assignedTo && <span className="text-blue-600">Assigned to {t.assignedTo}</span>}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(t.id);
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  Open chat
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredTickets.length)} of{' '}
              {filteredTickets.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-orange-500 text-white'
                      : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Chat modal */}
      {selectedId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedId(null)}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col"
          >
            {detailLoading || !detail ? (
              <div className="p-12 text-center text-gray-500">Loading ticket…</div>
            ) : (
              <>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-xl font-bold text-gray-900 truncate">{detail.subject}</h2>
                      <StatusPill status={detail.status} />
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          socketConnected
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                        title={socketConnected ? 'Live updates on' : 'Reconnecting…'}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            socketConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                          }`}
                        />
                        {socketConnected ? 'Live' : 'Offline'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      From <strong className="text-gray-700">{detail.createdByName}</strong>
                      {detail.createdByEmail && detail.createdByEmail !== detail.createdByName && (
                        <span className="text-gray-400"> ({detail.createdByEmail})</span>
                      )}
                      {' · Opened '}
                      {new Date(detail.createdAt).toLocaleString()}
                      {detail.assignedTo && (
                        <span className="ml-2 text-blue-600">· Assigned to {detail.assignedTo}</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedId(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Action bar */}
                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2 flex-wrap">
                  {!detail.assignedTo && (
                    <button
                      onClick={handleAssignToSelf}
                      className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      Assign to me
                    </button>
                  )}
                  <select
                    value={detail.status}
                    onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <span className="text-xs text-gray-500 ml-auto">
                    Status changes notify the user by email.
                  </span>
                </div>

                {/* Conversation */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50 max-h-[50vh]">
                  {detail.messages.length === 0 && (
                    <p className="text-center text-sm text-gray-500">No messages yet.</p>
                  )}
                  {detail.messages.map((m) => {
                    const mine = isMyMessage(m);
                    return (
                      <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            mine
                              ? 'bg-orange-500 text-white rounded-tr-sm'
                              : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm'
                          }`}
                        >
                          <p
                            className={`text-[11px] font-medium mb-1 ${
                              mine ? 'text-orange-100' : 'text-gray-500'
                            }`}
                          >
                            {mine ? 'You' : m.senderName ?? m.senderEmail ?? 'User'}
                            {!mine && m.senderRole && (
                              <span className="ml-1.5 opacity-75">({m.senderRole})</span>
                            )}
                            <span className="ml-2 opacity-75">
                              {m.sentAt ? new Date(m.sentAt).toLocaleString() : ''}
                            </span>
                          </p>
                          {m.message && (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
                          )}
                          {m.attachments && m.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {m.attachments.map((a, i) => (
                                <AttachmentChip key={i} a={a} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {otherTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 inline-flex items-center gap-2">
                        <span className="text-xs text-gray-500">{otherTyping} is typing</span>
                        <span className="flex gap-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply */}
                {detail.status === 'closed' ? (
                  <div className="p-4 border-t border-gray-100 text-sm text-center text-gray-500 bg-gray-50">
                    This ticket is closed. Re-open it from the status dropdown to reply.
                  </div>
                ) : (
                  <form onSubmit={handleSendReply} className="p-4 border-t border-gray-100 space-y-2">
                    {pendingFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {pendingFiles.map((f, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 rounded-lg text-xs"
                          >
                            {f.type.startsWith('image/') ? (
                              <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                            ) : (
                              <FileText className="w-3.5 h-3.5 text-orange-600" />
                            )}
                            <span className="truncate max-w-[140px]">{f.name}</span>
                            <button
                              type="button"
                              onClick={() => removePending(i)}
                              className="hover:text-red-600"
                              aria-label="Remove"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 items-end relative">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/png,image/jpeg,image/gif,image/webp,application/pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={pendingFiles.length >= 5}
                        title="Attach file"
                        className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        <Paperclip className="w-4 h-4 text-gray-500" />
                      </button>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowTemplatesMenu((s) => !s)}
                          title="Quick replies"
                          className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          <Sparkles className="w-4 h-4 text-orange-500" />
                        </button>
                        {showTemplatesMenu && (
                          <div className="absolute bottom-full mb-2 left-0 w-80 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                Quick replies
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowTemplatesMenu(false);
                                  setShowManageTemplates(true);
                                }}
                                className="text-xs text-orange-600 hover:underline"
                              >
                                Manage
                              </button>
                            </div>
                            {templates.length === 0 ? (
                              <p className="p-4 text-sm text-gray-500 text-center">
                                No templates yet.
                              </p>
                            ) : (
                              templates.map((tpl) => (
                                <button
                                  key={tpl._id}
                                  type="button"
                                  onClick={() => {
                                    setReply((prev) => (prev ? `${prev}\n\n${tpl.content}` : tpl.content));
                                    setShowTemplatesMenu(false);
                                  }}
                                  className="w-full text-left p-3 hover:bg-orange-50 border-b border-gray-50 last:border-0"
                                >
                                  <p className="font-medium text-gray-900 text-sm">{tpl.name}</p>
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                    {tpl.content}
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <textarea
                        value={reply}
                        onChange={(e) => {
                          setReply(e.target.value);
                          notifyTyping();
                        }}
                        placeholder="Type your reply… The user will get an email."
                        rows={2}
                        className="flex-1 resize-none px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                      <button
                        type="submit"
                        disabled={sending || (!reply.trim() && pendingFiles.length === 0)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        {sending ? 'Sending…' : 'Send'}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Manage templates */}
      {showManageTemplates && (
        <ManageTemplatesModal
          onClose={() => {
            setShowManageTemplates(false);
            loadTemplates();
          }}
        />
      )}
    </motion.div>
  );
}

// ────────────────────────── Templates manager ──────────────────────────

function ManageTemplatesModal({ onClose }: { onClose: () => void }) {
  const [list, setList] = useState<ITicketTemplate[]>([]);
  const [editing, setEditing] = useState<ITicketTemplate | null>(null);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    try {
      const res = await adminApi.getTicketTemplates(false);
      const items = (res.data as any)?.data ?? [];
      setList(Array.isArray(items) ? items : []);
    } catch {
      setList([]);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const reset = () => {
    setEditing(null);
    setName('');
    setContent('');
    setError(null);
  };

  const onEdit = (tpl: ITicketTemplate) => {
    setEditing(tpl);
    setName(tpl.name);
    setContent(tpl.content);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (editing) {
        await adminApi.updateTicketTemplate(editing._id, { name, content });
      } else {
        await adminApi.createTicketTemplate({ name, content });
      }
      reset();
      await reload();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await adminApi.deleteTicketTemplate(id);
      await reload();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to delete');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Manage reply templates</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 overflow-hidden">
          {/* List */}
          <div className="border-r border-gray-100 overflow-y-auto">
            {list.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">No templates yet.</p>
            ) : (
              list.map((tpl) => (
                <div
                  key={tpl._id}
                  className={`p-4 border-b border-gray-50 cursor-pointer transition-colors ${
                    editing?._id === tpl._id ? 'bg-orange-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onEdit(tpl)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-gray-900">{tpl.name}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(tpl._id);
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tpl.content}</p>
                </div>
              ))
            )}
          </div>
          {/* Form */}
          <form onSubmit={onSave} className="p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {editing ? 'Edit template' : 'New template'}
              </h3>
              {editing && (
                <button
                  type="button"
                  onClick={reset}
                  className="text-sm text-orange-600 hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
              )}
            </div>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="e.g. Looking into this"
                maxLength={100}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                placeholder="The canned response that gets inserted into the reply box."
                maxLength={5000}
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create template'}
            </button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
}
