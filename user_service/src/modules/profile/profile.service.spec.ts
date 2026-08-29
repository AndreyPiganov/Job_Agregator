import { UserEnumMapper } from '../../common/mappers/user-enum.mapper';
import { ProfileMapper } from './profile.mapper';
import { ProfileRepository } from './profile.repository';
import { ProfileService } from './profile.service';
import type { ProfileRecord } from './interfaces/profile.interfaces';

describe('ProfileService contacts', () => {
  const userId = '018f1f4e-7b5a-7c2d-8f31-f30e74d4d101';
  const now = new Date('2026-08-25T12:00:00.000Z');

  it('canonicalizes voluntary contacts and returns them with the profile', async () => {
    const profiles: jest.Mocked<Pick<ProfileRepository, 'findByUserId' | 'upsert'>> = {
      findByUserId: jest.fn().mockResolvedValue(profileRecord(null)),
      upsert: jest.fn(),
    };
    profiles.upsert.mockImplementation((data) =>
      Promise.resolve(
        profileRecord({
          email: data.contacts?.email ?? null,
          phoneNumber: data.contacts?.phoneNumber ?? null,
          telegramUsername: data.contacts?.telegramUsername ?? null,
          githubUsername: data.contacts?.githubUsername ?? null,
        }),
      ),
    );
    const service = profileService(profiles);

    const result = await service.upsert({
      user_id: userId,
      first_name: 'Иван',
      last_name: 'Иванов',
      languages: [],
      citizenship_codes: [],
      contacts: {
        email: ' Contact@Example.com ',
        phone_number: ' +79991234567 ',
        telegram_username: 'Telegram_User',
        github_username: 'GitHub-User',
      },
    });

    expect(profiles.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        contacts: {
          email: 'contact@example.com',
          phoneNumber: '+79991234567',
          telegramUsername: 'telegram_user',
          githubUsername: 'github-user',
        },
      }),
    );
    expect(result.contacts).toEqual({
      email: 'contact@example.com',
      phone_number: '+79991234567',
      telegram_username: 'telegram_user',
      github_username: 'github-user',
    });
  });

  it('removes the contact record when contacts are omitted from the full replacement', async () => {
    const profiles: jest.Mocked<Pick<ProfileRepository, 'findByUserId' | 'upsert'>> = {
      findByUserId: jest.fn().mockResolvedValue(profileRecord(null)),
      upsert: jest.fn().mockResolvedValue(profileRecord(null)),
    };
    const service = profileService(profiles);

    await service.upsert({
      user_id: userId,
      first_name: 'Иван',
      last_name: 'Иванов',
      languages: [],
      citizenship_codes: [],
    });

    expect(profiles.upsert).toHaveBeenCalledWith(expect.objectContaining({ contacts: null }));
  });

  it('leaves infrastructure errors for the global exception filters', async () => {
    const databaseError = new Error('database write failed');
    const profiles: jest.Mocked<Pick<ProfileRepository, 'findByUserId' | 'upsert'>> = {
      findByUserId: jest.fn().mockResolvedValue(profileRecord(null)),
      upsert: jest.fn().mockRejectedValue(databaseError),
    };
    const service = profileService(profiles);

    await expect(
      service.upsert({
        user_id: userId,
        first_name: 'Иван',
        last_name: 'Иванов',
        languages: [{ code: 'xx', proficiency: 1 }],
        citizenship_codes: [],
      }),
    ).rejects.toBe(databaseError);
  });

  function profileRecord(
    contact: {
      email: string | null;
      phoneNumber: string | null;
      telegramUsername: string | null;
      githubUsername: string | null;
    } | null,
  ): ProfileRecord {
    return {
      userId,
      firstName: 'Иван',
      lastName: 'Иванов',
      middleName: null,
      birthDate: null,
      gender: null,
      city: null,
      photoUrl: null,
      about: null,
      relocationReadiness: null,
      createdAt: now,
      updatedAt: now,
      user: {
        id: userId,
        createdAt: now,
        updatedAt: now,
        contact: contact ? { userId, ...contact, createdAt: now, updatedAt: now } : null,
      },
      languages: [],
      citizenships: [],
      educations: [],
      experiences: [],
    };
  }

  function profileService(profiles: jest.Mocked<Pick<ProfileRepository, 'findByUserId' | 'upsert'>>): ProfileService {
    const mapper = new ProfileMapper(new UserEnumMapper());
    return new ProfileService(profiles as unknown as ProfileRepository, mapper);
  }
});
