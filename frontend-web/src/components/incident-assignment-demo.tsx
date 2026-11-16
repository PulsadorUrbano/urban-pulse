import { useEffect, useState } from 'react';

import { startDemoAssignment } from '../services/assignment.service';
import type { IncidentDetail } from '../types/incident';
import { IncidentAssignmentView } from './incident-assignment-view';

export function IncidentAssignmentDemo() {
  const [data, setData] = useState<Awaited<ReturnType<typeof startDemoAssignment>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    startDemoAssignment().then(
      (result) => { if (active) setData(result); },
      () => { if (active) setError('No se pudo cargar la demostración.'); },
    );
    return () => { active = false; };
  }, []);

  const handleSaved = (incident: IncidentDetail) => {
    setData((current) => current && { ...current, incident });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 text-zinc-900 dark:text-zinc-100 sm:p-6">
      <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
        Modo demostración. Los cambios solo se guardan en memoria.
      </p>
      {error ? <p role="alert">{error}</p> : data ? (
        <IncidentAssignmentView incident={data.incident} mode={{ demoOptions: data.options }} onSaved={handleSaved} />
      ) : <p role="status">Cargando demostración…</p>}
    </div>
  );
}
