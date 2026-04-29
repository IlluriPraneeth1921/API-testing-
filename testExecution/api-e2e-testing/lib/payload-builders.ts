import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const FIXTURES = path.join(__dirname, '..', 'fixtures');

function tag(): string {
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return ts + uuidv4().slice(0, 4);
}

function loadTemplate(name: string): any {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf-8'));
}

export interface RefKeys {
  programKeys: string[];
  orgRoleKeys: string[];
  locRoleKeys: string[];
}

export function buildOrganization(refs?: RefKeys): any {
  const p = loadTemplate('Organization.json');
  const t = tag();
  p.businessProfile.doingBusinessAsName = `DBA_${t}`;
  p.businessProfile.fullName = `Full_${t}`;
  p.businessProfile.shortName = `Short_${t}`;
  p.organizationEmailAddresses[0].email = `o1_${t}@test.com`;
  p.organizationEmailAddresses[1].email = `o2_${t}@test.com`;
  p.organizationAddresses.forEach((a: any, i: number) => {
    a.cityName = `City${i}_${t}`;
    a.firstStreetAddress = `St${i}a_${t}`;
    a.secondStreetAddress = `St${i}b_${t}`;
  });
  p.organizationPhones[0].number = '1 (234) 567-0001';
  p.organizationPhones[1].number = '1 (234) 567-0002';
  p.organizationIdentifiers.forEach((ident: any, i: number) => {
    ident.effectiveDateRange.startDate = '2024-01-01';
    ident.effectiveDateRange.endDate = '2025-12-31';
    const code = ident.type?.code || '';
    if (code === '1000005') ident.value = `12345${i}${'0'.repeat(10 - `12345${i}`.length)}`;
    else if (code === '1000004') ident.value = `98765${i}321`;
    else ident.value = `OID${i}_${t}`;
  });
  p.organizationCredentials.forEach((c: any, i: number) => {
    c.credentialNumber = `OCR${i}_${t}`;
    c.effectiveDateRange.startDate = '2024-01-01';
    c.effectiveDateRange.endDate = '2025-12-31';
  });
  const pk = refs?.programKeys || [];
  const rk = refs?.orgRoleKeys || [];
  if (pk.length) p.organizationSupportedPrograms = pk.slice(0, 2);
  else delete p.organizationSupportedPrograms;
  if (rk.length) p.organizationSupportedRoles = rk.slice(0, 2);
  else delete p.organizationSupportedRoles;
  return p;
}

export function buildOrgContact(refs?: RefKeys): any {
  const t = tag();
  const payload: any = {
    emailAddress: `poc_${t}@test.com`, isPrimary: true, name: `POC_${t}`,
    phone: {
      extension: '123456', isPrimary: true, isTextTelephone: true,
      note: 'Phone testing', number: '1 (234) 567-9999',
      phoneType: { codeSystemIdentifier: '1', name: 'Home', code: '400003' },
    },
    title: `Title_${t}`,
    type: { codeSystemIdentifier: '1', name: 'Administrator', code: '3100001' },
  };
  if (refs?.programKeys?.length) payload.associatedPrograms = [{ key: refs.programKeys[0] }];
  return payload;
}

export function buildServiceArea(): any {
  return {
    countyAreas: [
      { codeSystemIdentifier: '1', name: 'Adams County', code: '901991' },
      { codeSystemIdentifier: '1', name: 'Benson County', code: '901993' },
    ],
    stateProvince: { codeSystemIdentifier: '1', name: 'Montana', code: '800028' },
  };
}

export function buildLocation(orgKey: string, refs?: RefKeys): any {
  const p = loadTemplate('Location.json');
  const t = tag();
  p.organizationKey = orgKey;
  p.businessProfile.doingBusinessAsName = `LDBA_${t}`;
  p.businessProfile.fullName = `LFull_${t}`;
  p.businessProfile.shortName = `LShort_${t}`;
  p.locationEmailAddresses[0].email = `l1_${t}@test.com`;
  p.locationEmailAddresses[1].email = `l2_${t}@test.com`;
  p.locationAddresses[0].cityName = `LCity_${t}`;
  p.locationAddresses[0].firstStreetAddress = `LSt1_${t}`;
  p.locationAddresses[0].secondStreetAddress = `LSt2_${t}`;
  p.locationPhones[0].number = '1 (234) 567-1001';
  p.locationPhones[1].number = '1 (234) 567-1002';
  p.locationIdentifiers.forEach((lid: any, i: number) => { lid.value = `LID${i}_${t}`; });
  const pk = refs?.programKeys || [];
  const rk = refs?.locRoleKeys || [];
  if (pk.length) p.locationSupportedPrograms = pk.slice(0, 1);
  else delete p.locationSupportedPrograms;
  if (rk.length) p.locationSupportedRoles = rk.slice(0, 1);
  else delete p.locationSupportedRoles;
  p.locationCredentials = [{
    credentialNumber: `LCR0_${t}`,
    effectiveDateRange: { startDate: '2024-01-01', endDate: '2025-12-31' },
    note: 'Location credential test',
    type: { code: '41000004', codeSystemIdentifier: '1', name: 'Accredited' },
    accreditationBody: { code: '41100003', codeSystemIdentifier: '1', name: 'Joint Commission' },
  }];
  return p;
}

export function buildLocContact(refs?: RefKeys): any {
  const t = tag();
  const payload: any = {
    emailAddress: `lpoc_${t}@test.com`, isPrimary: true, name: `LPOC_${t}`,
    phone: {
      extension: '123', isPrimary: false, isTextTelephone: false,
      note: 'phonenote', number: '1 (234) 567-8888',
      phoneType: { codeSystemIdentifier: '1', name: 'Admissions', code: '3100002' },
    },
    title: `LTitle_${t}`,
    type: { codeSystemIdentifier: '1', name: 'Administrator', code: '3100001' },
  };
  if (refs?.programKeys?.length) payload.associatedPrograms = [{ key: refs.programKeys[0] }];
  return payload;
}

export function buildLocType(): any {
  return {
    locationPrimaryType: { codeSystemIdentifier: '1', name: 'Waiver Service Provider', code: '2800003' },
    locationSubTypes: [{ codeSystemIdentifier: '1', name: '01-Hospital', code: '2900098' }],
  };
}

export function buildLocServiceArea(): any {
  return {
    countyAreas: [{ codeSystemIdentifier: '1', name: 'Autauga County', code: '900001' }],
    stateProvince: { codeSystemIdentifier: '1', name: 'Alabama', code: '800001' },
  };
}

export function buildLocSpecialty(): any {
  return {
    effectiveDateRange: { startDate: '2024-01-01', endDate: '2025-12-31' },
    isPrimary: true,
    locationSpecialtyCode: { codeSystemIdentifier: '1', name: 'Case Management', code: '2600001' },
  };
}

export function buildStaffMember(orgKey: string): any {
  const p = loadTemplate('StaffMember.json');
  const t = tag();
  p.organizationKey = orgKey;
  const n = p.staffMemberName;
  n.firstName = `FN_${t}`; n.lastName = `LN_${t}`; n.middleName = `MN_${t}`;
  n.maidenName = `LN_${t}`; n.preferredName = `FN_${t}`; n.suffixName = `SFX_${t}`;
  p.staffMemberEmailAddresses?.forEach((em: any, i: number) => { em.email = `s${i + 1}_${t}@test.com`; });
  p.staffMemberPhones?.forEach((ph: any, i: number) => { ph.number = `1 (234) 567-200${i + 1}`; });
  p.staffMemberIdentifiers?.forEach((id: any, i: number) => {
    id.effectiveDateRange.startDate = '2024-01-01';
    id.effectiveDateRange.endDate = '2025-12-31';
    id.value = `SID${i}_${t}`;
  });
  p.staffMemberCredentials?.forEach((c: any, i: number) => {
    c.effectiveDateRange.startDate = '2024-01-01';
    c.effectiveDateRange.endDate = '2025-12-31';
    c.qualificationNumber = `SQN${i}_${t}`;
  });
  return p;
}

export function buildStaffAddress(): any {
  const t = tag();
  return {
    cityName: `SCity_${t}`,
    countyArea: { codeSystemIdentifier: '1', name: 'Aleutians West Census Area', code: '900069' },
    current: { codeSystemIdentifier: '1', name: 'Yes', code: '6500002' },
    firstStreetAddress: `SSt1_${t}`, isActive: true, isPrimary: true, note: 'Addresse note testing',
    physicalAddressType: { codeSystemIdentifier: '1', name: 'Physical', code: '500003' },
    postalCode: '79032-2374', secondStreetAddress: `SSt2_${t}`,
    stateProvince: { codeSystemIdentifier: '1', name: 'Alaska', code: '800002' },
    verificationStatus: { codeSystemIdentifier: '1', name: 'Verified', code: '4400015' },
    attributes: [{ codeSystemIdentifier: '1', name: 'Work', code: '1500012' }],
  };
}

export function buildStaffLocAssignment(locKey: string, staffKey: string): any {
  return { locationKey: locKey, staffMemberKey: staffKey };
}
