import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LifeBuoy,
  Plus,
  Send,
  MessageSquare,
  Lock,
  CheckCircle,
  Clock,
  AlertCircle,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import {
  supportEndpoints,
  type TicketStatus,
  type TicketSummary,
  type TicketDetail,
  type TicketAttachment,
  type TicketMessage,
} from '@/api/support';
import { useAuthStore } from '@/store/authStore';
import { useTicketSocket } from '@/hooks/useTicketSocket';

const API_ORIGIN = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(
  /\/api\/v1\/?$/,
  ''
);

const STATUS_LABELS: Record<TicketStatus, { label: string; classes: string; Icon: typeof Clock }> = {
  open: { label: 'Open', classes: 'bg-blue-50 text-blue-700 border-blue-200', Icon: AlertCircle },
  in_progress: {
    label: 'In progress',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    Icon: Clock,
  },
  resolved: {
    label: 'Resolved',
    classes: 'bg-green-50 text-green-700 border-green-200',
    Icon: CheckCircle,
  },
  closed: { label: 'Closed', classes: 'bg-gray-100 text-gray-700 border-gray-200', Icon: Lock },
};

function StatusPill({ status }: { status: TicketStatus }) {
  const cfg = STATUS_LABELS[status];
  const { Icon } = cfg;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.classes}`}
    >
      <Icon className="w-3 h-3" />
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

function AttachmentChip({ a }: { a: TicketAttachment }) {
  const fullUrl = a.url.startsWith('http') ? a.url : `${API_ORIGIN}${a.url}`;
  if (isImage(a.mime)) {
    return (
      <a href={fullUrl} target="_blank" rel="noreferrer" className="block">
        <img
          src={fullUrl}
          alt={a.filename}
          className="max-w-full max-h-48 rounded-lg border border-white/40 object-cover"
        />
      </a>
    );
  }
  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 px-3 py-2 bg-white/40 border border-white/50 rounded-lg text-sm hover:bg-white/60 transition-colors"
    >
      <FileText className="w-4 h-4" />
      <span className="truncate max-w-[180px]">{a.filename}</span>
      <span className="text-xs opacity-70">{formatBytes(a.size)}</span>
    </a>
  );
}

export default function Support() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [otherTyping, setOtherTyping] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userId = user?.id;

  const isMine = (senderId: TicketMessage['sender_id']) => {
    if (typeof senderId === 'string') return senderId === userId;
    return senderId?._id === userId;
  };

  const [searchParams, setSearchParams] = useSearchParams();

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await supportEndpoints.listMyTickets();
      const list = (res.data as any)?.data ?? [];
      setTickets(Array.isArray(list) ? list : []);
      if (list.length > 0 && !selectedId) {
        setSelectedId(list[0]._id);
      }
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-open a specific ticket when the URL has ?id=… (notification deep link).
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
    supportEndpoints
      .getMyTicket(selectedId)
      .then((res) => {
        if (cancelled) return;
        setDetail((res.data as any)?.data ?? null);
      })
      .catch(() => {
        if (!cancelled) setDetail(null);
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
      setDetail((prev) => {
        if (!prev) return prev;
        if (prev.messages.some((m) => m._id === msg._id)) return prev;
        return { ...prev, messages: [...prev.messages, msg] };
      });
      // bump list ordering
      setTickets((prev) =>
        prev.map((t) => (t._id === selectedId ? { ...t, updatedAt: msg.sent_at } : t))
      );
    },
    onStatus: (status) => {
      setDetail((prev) => (prev ? { ...prev, status: status as TicketStatus } : prev));
      setTickets((prev) =>
        prev.map((t) => (t._id === selectedId ? { ...t, status: status as TicketStatus } : t))
      );
    },
    onTyping: (info) => {
      if (info.userId === userId) return;
      const label =
        info.role && info.role !== 'job_seeker' && !info.role.startsWith('company_')
          ? 'Support'
          : info.displayName ?? info.email ?? 'Someone';
      setOtherTyping(label);
    },
    onStoppedTyping: () => setOtherTyping(null),
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await supportEndpoints.createTicket({
        subject: newSubject.trim(),
        description: newDescription.trim(),
      });
      const created = (res.data as any)?.data;
      setShowNewModal(false);
      setNewSubject('');
      setNewDescription('');
      await loadList();
      if (created?._id) setSelectedId(created._id);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to raise ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    const next = [...pendingFiles, ...Array.from(list)].slice(0, 5);
    setPendingFiles(next);
    e.target.value = '';
  };

  const removePending = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    if (!replyText.trim() && pendingFiles.length === 0) return;
    setReplying(true);
    try {
      let attachments: TicketAttachment[] | undefined;
      if (pendingFiles.length > 0) {
        const upRes = await supportEndpoints.uploadAttachments(selectedId, pendingFiles);
        attachments = (upRes.data as any)?.data ?? [];
      }
      const replyRes = await supportEndpoints.replyToTicket(selectedId, {
        message: replyText.trim() || undefined,
        attachments,
      });
      const saved = (replyRes.data as any)?.data;
      if (saved && saved._id) {
        setDetail((prev) => {
          if (!prev) return prev;
          if (prev.messages.some((m) => m._id === saved._id)) return prev;
          return { ...prev, messages: [...prev.messages, saved as TicketMessage] };
        });
      }
      setReplyText('');
      setPendingFiles([]);
      // Refresh list ordering; socket echo (if it arrives) is deduped by _id.
      loadList().catch(() => {});
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const isClosed = useMemo(() => detail?.status === 'closed', [detail]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
            <LifeBuoy className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Help & Support</h1>
            <p className="text-gray-600">Raise a ticket and our team will get back to you.</p>
          </div>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium shadow-lg shadow-orange-200"
        >
          <Plus className="w-5 h-5" />
          New ticket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 min-h-[480px]">
        {/* List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">My tickets</h2>
            <p className="text-xs text-gray-500">{tickets.length} total</p>
          </div>
          <div className="max-h-[60vh] overflow-y-auto divide-y divide-gray-50">
            {loading && tickets.length === 0 && (
              <p className="p-6 text-sm text-gray-500 text-center">Loading…</p>
            )}
            {!loading && tickets.length === 0 && (
              <p className="p-6 text-sm text-gray-500 text-center">
                No tickets yet. Open one with the button above.
              </p>
            )}
            {tickets.map((t) => {
              const active = t._id === selectedId;
              return (
                <button
                  key={t._id}
                  onClick={() => setSelectedId(t._id)}
                  className={`w-full text-left p-4 transition-colors ${
                    active ? 'bg-orange-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-gray-900 truncate">{t.subject}</p>
                    <StatusPill status={t.status} />
                  </div>
                  <p className="text-xs text-gray-500">
                    Updated {new Date(t.updatedAt).toLocaleString()}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          {detail ? (
            <>
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-bold text-gray-900">{detail.subject}</h2>
                  <div className="flex items-center gap-2">
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
                    <StatusPill status={detail.status} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Opened {new Date(detail.createdAt).toLocaleString()}
                  {detail.assigned_to?.email && <> · Assigned to {detail.assigned_to.email}</>}
                </p>
              </div>

              <div className="flex-1 p-6 space-y-4 overflow-y-auto max-h-[55vh]">
                {detail.messages.length === 0 && (
                  <p className="text-sm text-gray-500 text-center">No messages yet.</p>
                )}
                {detail.messages.map((m) => {
                  const mine = isMine(m.sender_id);
                  const senderName =
                    typeof m.sender_id === 'object'
                      ? m.sender_id?.display_name ?? m.sender_id?.email ?? 'Support'
                      : 'Support';
                  return (
                    <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          mine
                            ? 'bg-orange-500 text-white rounded-tr-sm'
                            : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                        }`}
                      >
                        <p
                          className={`text-[11px] font-medium mb-1 ${
                            mine ? 'text-orange-100' : 'text-gray-500'
                          }`}
                        >
                          {mine ? 'You' : senderName}
                          <span className="ml-2 opacity-75">{new Date(m.sent_at).toLocaleString()}</span>
                        </p>
                        {m.message && (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
                        )}
                        {m.attachments && m.attachments.length > 0 && (
                          <div className={`mt-2 space-y-2 ${m.message ? '' : ''}`}>
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
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 inline-flex items-center gap-2">
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

              {!isClosed ? (
                <form onSubmit={handleReply} className="p-4 border-t border-gray-100 space-y-2">
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
                  <div className="flex gap-2 items-end">
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
                      title="Attach file (max 5, 10 MB each)"
                      className="p-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      <Paperclip className="w-4 h-4 text-gray-500" />
                    </button>
                    <textarea
                      value={replyText}
                      onChange={(e) => {
                        setReplyText(e.target.value);
                        notifyTyping();
                      }}
                      placeholder="Type your reply…"
                      rows={2}
                      className="flex-1 resize-none px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="submit"
                      disabled={replying || (!replyText.trim() && pendingFiles.length === 0)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {replying ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 border-t border-gray-100 text-sm text-gray-500 text-center bg-gray-50 rounded-b-2xl">
                  This ticket is closed. Open a new one if you still need help.
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">
                {tickets.length === 0
                  ? 'No tickets yet — raise one to start.'
                  : 'Select a ticket to view the conversation.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {showNewModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowNewModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-lg w-full"
          >
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Raise a new ticket</h2>
              <p className="text-sm text-gray-500 mt-1">
                Briefly describe the problem. Our team will respond by email and in the dashboard.
              </p>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g. Can't upload my resume"
                  maxLength={255}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Steps to reproduce, what you expected, what happened…"
                  maxLength={5000}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Tip: you can attach screenshots or PDFs once the ticket is open.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl hover:from-orange-700 hover:to-orange-600 transition-colors font-medium disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit ticket'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
