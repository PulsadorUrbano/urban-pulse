/// <reference types="jest" />
import { act, renderHook } from '@testing-library/react-native';

import { useCreateIncident } from '@/hooks/use-create-incident';
import { createIncident } from '@/services/incident.service';
import type { CreateIncidentInput, IncidentPayload } from '@/types/incident';

jest.mock('@/services/incident.service', () => ({
  createIncident: jest.fn(),
}));

const mockedCreateIncident = createIncident as jest.MockedFunction<typeof createIncident>;

const validInput: CreateIncidentInput = {
  title: 'Bache en la avenida principal',
  description: 'Hay un bache profundo que pone en riesgo a los vehículos.',
  latitude: null,
  longitude: null,
  accuracy: null,
};

const createdIncident: IncidentPayload & { id: string } = {
  id: '42',
  title: validInput.title,
  description: validInput.description,
  latitude: 40.4168,
  longitude: -3.7038,
  accuracy: 10,
  civicId: '20ac442e-0f00-4fe4-bad3-61c8e8e0bff5',
  categoryId: 'infrastructure',
  category: 'Vía pública',
};

describe('useCreateIncident', () => {
  beforeEach(() => {
    mockedCreateIncident.mockReset();
  });

  it('en éxito devuelve la incidencia y deja isSubmitting en false', async () => {
    mockedCreateIncident.mockResolvedValueOnce(createdIncident);
    const { result } = await renderHook(() => useCreateIncident());

    let returned: (IncidentPayload & { id: string }) | null = null;
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

    let returned: (IncidentPayload & { id: string }) | null = createdIncident;
    await act(async () => {
      returned = await result.current.submitIncident(validInput);
    });

    expect(returned).toBeNull();
    expect(result.current.isSubmitting).toBe(false);
    expect(result.current.errorMessage).toBe('No se pudo registrar la incidencia.');
  });
});
