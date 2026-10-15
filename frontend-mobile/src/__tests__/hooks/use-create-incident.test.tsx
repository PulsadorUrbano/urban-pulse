/// <reference types="jest" />
import { act, renderHook } from '@testing-library/react-native';

import { useCreateIncident } from '@/hooks/use-create-incident';
import { createIncident } from '@/services/incident.service';
import type { CreateIncidentInput, Incident } from '@/types/incident';

jest.mock('@/services/incident.service', () => ({
  createIncident: jest.fn(),
}));

const mockedCreateIncident = createIncident as jest.MockedFunction<typeof createIncident>;

const validInput: CreateIncidentInput = {
  title: 'Bache en la avenida principal',
  description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
};

const createdIncident: Incident = {
  id: '42',
  title: validInput.title,
  description: validInput.description,
  status: 'reported',
  priority: null,
  createdAt: '2026-10-12T14:00:00.000Z',
  civicId: null,
  locationId: null,
  urbanAssetId: null,
  categoryId: null,
  category: null,
  departmentId: null,
  teamId: null,
  technicianId: null,
};

describe('useCreateIncident', () => {
  beforeEach(() => {
    mockedCreateIncident.mockReset();
  });

  it('en éxito devuelve la incidencia y deja isSubmitting en false', async () => {
    mockedCreateIncident.mockResolvedValueOnce(createdIncident);
    const { result } = await renderHook(() => useCreateIncident());

    let returned: Incident | null = null;
    await act(async () => {
      returned = await result.current.submitIncident(validInput);
    });

    expect(mockedCreateIncident).toHaveBeenCalledWith(validInput);
    expect(returned).toEqual(createdIncident);
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it('en error rellena errorMessage y devuelve null', async () => {
    mockedCreateIncident.mockRejectedValueOnce(new Error('No se pudo registrar la incidencia.'));
    const { result } = await renderHook(() => useCreateIncident());

    let returned: Incident | null = createdIncident;
    await act(async () => {
      returned = await result.current.submitIncident(validInput);
    });

    expect(returned).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errorMessage).toBe('No se pudo registrar la incidencia.');
  });
});
