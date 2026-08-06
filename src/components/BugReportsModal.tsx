import React, { useState, useEffect } from 'react';
import { X, Bug, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface BugReport {
  id: string;
  user_id: string;
  message: string;
  screenshot_url: string | null;
  status: string;
  created_at: string;
}

interface BugReportsModalProps {
  supabase: SupabaseClient | null;
  onClose: () => void;
}

export const BugReportsModal = React.memo(function BugReportsModal({ supabase, onClose }: BugReportsModalProps) {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setReports(data || []);
    } catch (err: any) {
      console.error('Failed to fetch bug reports:', err);
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [supabase]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!supabase) return;
    try {
      await supabase.from('bug_reports').delete().eq('id', id);
      setReports(reports.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col lucid-scale" onClick={e => e.stopPropagation()}>
        
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-6 shrink-0">
          <h2 className="text-3xl font-black text-white uppercase tracking-widest flex items-center gap-4">
            <Bug className="text-red-500" size={32} /> Admin Inbox
          </h2>
          <button onClick={onClose} className="p-3 bg-zinc-900 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4 text-zinc-500">
              <Loader2 size={32} className="animate-spin text-red-500" />
              <div className="font-mono text-xs uppercase tracking-widest">Loading Intel...</div>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl font-mono text-sm text-center">
              Access Denied or Error: {error}
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4 text-zinc-500 opacity-50">
              <Bug size={48} />
              <div className="font-mono text-sm uppercase tracking-widest font-black">No issues reported!</div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {reports.map((report) => (
                <div key={report.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 relative group">
                  
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="text-[10px] text-zinc-500 font-mono mb-2 flex justify-between">
                        <span>User: {report.user_id || 'Anonymous'}</span>
                        <span>{new Date(report.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-zinc-300 font-mono whitespace-pre-wrap">{report.message}</p>
                    </div>
                    
                    <button 
                      onClick={(e) => handleDelete(report.id, e)}
                      className="p-2 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Delete Report"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {report.screenshot_url && (
                    <div className="mt-2 rounded-xl border border-zinc-800 overflow-hidden bg-black/50 p-2">
                      <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-2 flex items-center gap-2">
                        <ImageIcon size={12} /> Attached Evidence
                      </div>
                      <a href={report.screenshot_url} target="_blank" rel="noreferrer" className="block w-full">
                        <img 
                          src={report.screenshot_url} 
                          alt="Bug Screenshot" 
                          className="w-full max-h-[400px] object-contain rounded-lg hover:opacity-80 transition-opacity cursor-zoom-in" 
                        />
                      </a>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
