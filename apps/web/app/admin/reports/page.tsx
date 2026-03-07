'use client';

import { useEffect, useState } from 'react';

import { Button, Card, Input } from '@locus/ui';

import { getAdminReports, resolveReport } from '../../../services/admin.service';

type Report = {
  id: string;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  status: string;
  actionTaken: string | null;
  createdAt: string;
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [actionText, setActionText] = useState('');

  const load = async () => setReports(await getAdminReports());

  useEffect(() => {
    void load();
  }, []);

  return (
    <Card className="p-4">
      <h2 className="mb-3 text-lg font-semibold">Reports moderation</h2>
      <div className="space-y-3">
        {reports.map((report) => (
          <div key={report.id} className="rounded-lg border border-slate-200 p-3">
            <p className="font-medium">
              {report.targetType} | {report.status}
            </p>
            <p className="text-sm text-slate-600">{report.reason}</p>
            <p className="text-xs text-slate-500">
              reporter: {report.reporterId.slice(0, 8)} | target: {report.targetId.slice(0, 8)}
            </p>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Action taken..."
                value={actionText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setActionText(e.target.value)}
              />
              <Button
                onClick={async () => {
                  await resolveReport(report.id, actionText || 'reviewed');
                  setActionText('');
                  await load();
                }}
              >
                Resolve
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
