import { v4 as uuidv4 } from 'uuid';
import type { NoteRefKeys } from './note-sql-client';

function tag(): string {
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
  return ts + uuidv4().slice(0, 4);
}

function cc(code: string, name: string, cs = '1') {
  return { code, name, codeSystemIdentifier: cs };
}

export interface NoteConfig {
  name: string;
  post_path: string;
  get_path_tpl: string;
  sql_table: string;
  sql_key_col: string;
  sql_children?: [string, string][];
  sql_extra_lookups?: {
    table: string; fk: string; prefix: string;
    children?: [string, string, string][];
  }[];
  payload: any;
  put_after?: {
    path_tpl: string;
    payloads: { label: string; body: any; optional?: boolean }[];
  };
}

export function buildNoteConfigs(refs: NoteRefKeys): NoteConfig[] {
  const t = tag();
  const { org_key: org, loc_key: loc, staff_key: staff, program_key: prog, case_key, guardianship_key, psr_key } = refs;
  const configs: NoteConfig[] = [];

  configs.push({
    name: 'ScratchPadNote',
    post_path: '/api/v1/note-module/scratch-pad-note',
    get_path_tpl: '/api/v1/note-module/scratch-pad-note/{key}',
    sql_table: 'ScratchPadNote', sql_key_col: 'ScratchPadNoteKey',
    payload: { locationKey: loc, staffMemberKey: staff, message: `E2E scratch pad test ${t}`, title: `ScratchPad_${t}` },
  });

  configs.push({
    name: 'OrganizationNote',
    post_path: '/api/v1/note-module/organization-note',
    get_path_tpl: '/api/v1/note-module/organization-note/{key}',
    sql_table: 'OrganizationNote', sql_key_col: 'OrganizationNoteKey',
    payload: {
      authorLocationKey: loc, authorStaffMemberKey: staff,
      category: cc('42000001', 'General Note'), message: `E2E org note test ${t}`,
      organizationKey: org, programKey: prog, title: `OrgNote_${t}`,
    },
  });

  configs.push({
    name: 'LocationNote',
    post_path: '/api/v1/note-module/location-note',
    get_path_tpl: '/api/v1/note-module/location-note/{key}',
    sql_table: 'LocationNote', sql_key_col: 'LocationNoteKey',
    payload: {
      authorLocationKey: loc, authorStaffMemberKey: staff,
      category: cc('42100001', 'General Note'), locationKey: loc,
      message: `E2E loc note test ${t}`, programKey: prog, title: `LocNote_${t}`,
    },
  });

  if (case_key) {
    configs.push({
      name: 'GeneralNote',
      post_path: '/api/v1/note-module/general-note',
      get_path_tpl: '/api/v1/note-module/general-note/{key}',
      sql_table: 'GeneralNote', sql_key_col: 'GeneralNoteKey',
      sql_children: [['GeneralNoteActivityTypes', 'GeneralNoteKey']],
      payload: {
        authorLocationKey: loc, authorStaffMemberKey: staff, caseKey: case_key,
        billableYesNoResponseValues: cc('6500002', 'Yes'),
        collateralContact: {
          organizationName: `E2E Org ${t}`,
          personContactKeyReference: refs.collateral_contact_key || '',
          nameDescription: `E2E contact desc ${t}`,
          personName: { firstName: `First${t}`, lastName: `Last${t}`, maidenName: 'maiden', middleName: 'mid', preferredName: 'pref', prefixName: 'Dr', suffixName: 'Jr' },
          relationshipToPerson: cc('1900051', 'Advocate'), role: cc('1900001', 'Guardian'),
        },
        generalNoteActivityTypes: [cc('15000010', 'Visit - Office'), cc('15000009', 'Electronic Record Modification')],
        programKey: prog,
        progressNote: {
          activityDate: '2025-06-01T10:00:00Z', category: cc('4900001', 'General Note'),
          contactType: cc('3000010', 'In Person Visit/Meeting'), message: `E2E general note ${t}`,
          timeSpentMinutesCount: 30, timeSpentUnitsCount: 1, title: `GenNote_${t}`,
        },
        safetyAssessment: {
          observedSafetyFactors: [cc('26500005', 'Caregiver is answering all questions directed toward person'), cc('26500001', 'The person made verbal statement they did not feel safe')],
          observedVulnerabilityFactors: [cc('26400006', 'Significant substance abuse disorder'), cc('26400002', 'Diminished physical functioning')],
        },
      },
    });
  }

  if (case_key && guardianship_key) {
    configs.push({
      name: 'GuardianshipNote',
      post_path: '/api/v1/note-module/guardianship-note',
      get_path_tpl: '/api/v1/note-module/guardianship-note/{key}',
      sql_table: 'GuardianshipNote', sql_key_col: 'GuardianshipNoteKey',
      sql_children: [['GuardianshipNoteActivityTypes', 'GuardianshipNoteKey']],
      payload: {
        guardianshipKey: guardianship_key, authorLocationKey: loc, authorStaffMemberKey: staff,
        billable: cc('6500002', 'Yes'), caseKey: case_key, programKey: prog,
        progressNote: {
          activityDate: '2025-06-01T10:00:00Z', contactType: cc('3000010', 'In Person Visit/Meeting'),
          message: `E2E guardianship note ${t}`, timeSpentMinutesCount: 15, timeSpentUnitsCount: 1, title: `GuardNote_${t}`,
        },
      },
      put_after: {
        path_tpl: '/api/v1/note-module/guardianship-note/{key}',
        payloads: [
          { label: 'activityTypes+consent', body: { activityTypes: [cc('28500001', 'Medical'), cc('28500002', 'Financial')], consentRequested: cc('6500002', 'Yes') } },
          {
            label: 'contact', optional: true,
            body: {
              activityTypes: [cc('28500001', 'Medical'), cc('28500002', 'Financial')], consentRequested: cc('6500002', 'Yes'),
              contact: { personContactKeyReference: refs.person_contact_key || '', type: cc('108000001', 'Contact') },
            },
          },
        ],
      },
    });
  }

  if (case_key) {
    configs.push({
      name: 'CrisisContactNote',
      post_path: '/api/v1/note-module/crisis-contact-note',
      get_path_tpl: '/api/v1/note-module/crisis-contact-note/{key}',
      sql_table: 'CrisisContactNote', sql_key_col: 'CrisisContactNoteKey',
      sql_children: [
        ['CrisisContactNoteAdditionalCrisisServices', 'CrisisContactNoteKey'],
        ['CrisisContactNoteProvidedCrisisServices', 'CrisisContactNoteKey'],
        ['CrisisContactNoteEnhancedLevelOfServices', 'CrisisContactNoteKey'],
        ['CrisisContactNoteOtherServices', 'CrisisContactNoteKey'],
        ['CrisisContactNotePlacements', 'CrisisContactNoteKey'],
        ['CrisisContactNotePlansAndMeetings', 'CrisisContactNoteKey'],
        ['CrisisContactNoteVisitsAndFollowUps', 'CrisisContactNoteKey'],
        ['CrisisContactNoteWaiverServices', 'CrisisContactNoteKey'],
      ],
      payload: {
        authorLocationKey: loc, authorStaffMemberKey: staff, caseKey: case_key,
        crisisContactNote: {
          additionalCrisisServices: [cc('28100001', 'Ongoing phone supports from crisis (As needed) (Crisis Contact Note)')],
          crisisPreventionPlanNeedsToBeUpdated: cc('6500002', 'Yes'), crisisPreventionPlanReviewed: cc('6500002', 'Yes'),
          enhancedLevelOfServices: [cc('27800001', 'Brain Injury (Waiver Program Types)'), cc('27800002', 'Brain Injury Rehabilitative Services (Waiver Program Types)')],
          otherServices: [cc('27900001', 'Adult Mental Health Services (Other Program Types)')],
          personHasCrisisPreventionPlan: cc('6500002', 'Yes'), personResponseDescription: `E2E crisis response ${t}`,
          placements: [cc('27700001', 'Referral to homeless shelter (Crisis Contact Note)'), cc('27700002', 'Hospital Admission (for medical issues) (Crisis Contact Note)')],
          plansAndMeetings: [cc('27600003', 'Develop/revise Positive Support Plan (Crisis Contact Note)'), cc('27600005', 'Submit Safety Device Request (Crisis Contact Note)')],
          presentingConcernDescription: `E2E crisis concern ${t}`,
          providedCrisisServices: [cc('28300003', 'Consultation/Education Contact (Crisis Contact Note)'), cc('28300002', 'Comprehensive Assessment (Crisis Contact Note)')],
          referralSource: cc('28400012', 'Not Applicable (Crisis Contact Note)'),
          visitsAndFollowUps: [cc('28200004', 'Follow up appointment with specialist (Crisis Contact Note)')],
          waiverServices: [cc('27800002', 'Brain Injury Rehabilitative Services (Waiver Program Types)'), cc('27800005', 'Targeted Case Management (Waiver Program Types)')],
        },
        programKey: prog,
        progressNote: {
          activityDate: '2025-06-01T10:00:00Z', category: cc('4900004', 'Crisis Contact Note'),
          contactType: cc('3000011', 'Record Review/Documentation'), message: `E2E crisis contact note ${t}`,
          timeSpentMinutesCount: 110, timeSpentUnitsCount: 2, title: `CrisisContact_${t}`,
        },
        safetyAssessment: {
          observedSafetyFactors: [cc('26500005', 'Caregiver is answering all questions directed toward person'), cc('26500010', 'Person appears to be sexually abused or exploited'), cc('26500001', 'The person made verbal statement they did not feel safe')],
          observedVulnerabilityFactors: [cc('26400006', 'Significant substance abuse disorder'), cc('26400002', 'Diminished physical functioning'), cc('26400005', 'Significant mental health disorder')],
        },
      },
    });

    configs.push({
      name: 'CrisisResidentialNote',
      post_path: '/api/v1/note-module/crisis-residential-note',
      get_path_tpl: '/api/v1/note-module/crisis-residential-note/{key}',
      sql_table: 'CrisisResidentialNote', sql_key_col: 'CrisisResidentialNoteKey',
      sql_children: [['CrisisResidentialNoteSleepPatterns', 'CrisisResidentialNoteKey']],
      payload: {
        authorLocationKey: loc, authorStaffMemberKey: staff, caseKey: case_key,
        crisisResidentialNote: {
          activityParticipation: cc('27100001', 'Independent'), assaultive: cc('6500002', 'Yes'),
          dailyLivingActivity: cc('27400005', 'Total Care: depends completely on another person for physical support to initiate and complete a task'),
          diet: cc('27300003', 'Refused'), dietDescription: `E2E diet description ${t}`,
          homicidalIdeation: cc('6500002', 'Yes'), medicationCompliance: cc('6500002', 'Yes'),
          reportableEventCompleted: cc('6500002', 'Yes'), reportableEventExists: cc('6500002', 'Yes'),
          selfAbuse: cc('6500002', 'Yes'), sleepPatterns: [cc('27200004', "Didn't sleep"), cc('27200003', 'Restless')],
          suicidalIdeation: cc('6500002', 'Yes'),
        },
        programKey: prog,
        progressNote: {
          activityDate: '2023-07-31T06:26:23.466Z', contactType: cc('3000003', 'Email'),
          message: `E2E crisis residential note ${t}`, timeSpentMinutesCount: 10, timeSpentUnitsCount: 20, title: `CrisisResidential_${t}`,
        },
        safetyAssessment: {
          observedSafetyFactors: [cc('26500007', 'The person appears to be injured'), cc('26500002', 'The person made verbal statement they did not feel their home or environment was safe')],
          observedVulnerabilityFactors: [cc('26400003', "Another person has access to the person's finances/resources"), cc('26400002', 'Diminished physical functioning')],
        },
      },
    });

    const today = new Date().toISOString().slice(0, 10) + 'T00:00:00Z';
    configs.push({
      name: 'ProviderExplorationAndDiscoveryNote',
      post_path: '/api/v1/note-module/provider-exploration-and-discovery-note',
      get_path_tpl: '/api/v1/note-module/provider-exploration-and-discovery-note/{key}',
      sql_table: 'ProviderExplorationAndDiscoveryNote', sql_key_col: 'ProviderExplorationAndDiscoveryNoteKey',
      sql_children: [['ProviderExplorationAndDiscoveryNoteActivityTypes', 'ProviderExplorationAndDiscoveryNoteKey']],
      sql_extra_lookups: [{
        table: 'ProviderNoteExplorationAndDiscovery', fk: 'ProviderExplorationAndDiscoveryNoteKey', prefix: 'explorationAndDiscovery',
        children: [
          ['ProviderNoteExplorationAndDiscoveryExplorationSources', 'ProviderNoteExplorationAndDiscoveryKey', 'explorationSources'],
          ['ProviderNoteExplorationAndDiscoveryExplorationTypes', 'ProviderNoteExplorationAndDiscoveryKey', 'explorationTypes'],
        ],
      }],
      payload: {
        caseKey: case_key, currentStaffMemberKey: staff,
        explorationAndDiscovery: {
          dateRange: { endDate: today, startDate: today },
          category: cc('25800001', 'Lifelong Learning (Person History Type) (ME)'),
          subCategory: cc('25900002', 'Personal Safety (Person History Sub Type) (ME)'),
          source: [cc('102000001', 'Legal Guardian')], type: [cc('101900001', 'Legal Barriers')],
          whatWasLearnedDescription: `E2E what was learned ${t}`,
        },
        locationKey: loc,
        progressNote: {
          activityDate: today, contactType: cc('3000010', 'In Person Visit/Meeting'),
          message: `E2E provider exploration note ${t}`, timeSpentMinutesCount: 90, timeSpentUnitsCount: 1, title: `ProvExplore_${t}`,
        },
        providerExplorationAndDiscoveryNote: {
          activityTypes: [cc('15000009', 'Electronic Record Modification')],
          billable: cc('6500001', 'No'), collateralContactPersonContactKey: refs.collateral_contact_key || '',
        },
        safetyAssessment: {
          observedSafetyFactors: [cc('26500005', 'Caregiver is answering all questions directed toward person'), cc('26500010', 'Person appears to be sexually abused or exploited'), cc('26500001', 'The person made verbal statement they did not feel safe'), cc('26500011', "The person's home or neighborhood appears to be violent")],
          observedVulnerabilityFactors: [cc('26400006', 'Significant substance abuse disorder'), cc('26400002', 'Diminished physical functioning'), cc('26400005', 'Significant mental health disorder'), cc('26400003', "Another person has access to the person's finances/resources"), cc('26400001', 'Person is isolated or has a limited formal/informal support network'), cc('26400004', 'Significant medical disorder')],
        },
      },
    });
  }

  if (psr_key) {
    configs.push({
      name: 'ProtectiveServicesReportNote',
      post_path: '/api/v1/note-module/protective-services-report-note',
      get_path_tpl: '/api/v1/note-module/protective-services-report-note/{key}',
      sql_table: 'ProtectiveServicesReportNote', sql_key_col: 'ProtectiveServicesReportNoteKey',
      payload: {
        activityDate: '2025-06-01T10:00:00Z',
        author: { locationKey: loc, staffMemberKey: staff },
        category: cc('25400001', 'Adult Protective Services'),
        contact: {
          contactCategory: cc('108000001', 'Contact'), contactRelationshipDetailDescription: `E2E relationship detail ${t}`,
          contactRelationshipOtherDescription: `E2E other desc ${t}`, contactType: cc('25600004', 'Phone'),
          otherAddress: `123 Test St ${t}`, otherEmailAddress: `psr_${t}@test.com`, otherName: `Contact_${t}`,
          otherPhone: { extension: '1234', number: '1 (234) 567-8901' },
          personContactKeyReference: refs.person_contact_key || '', staffMemberKeyReference: refs.staff_key || '',
        },
        message: `E2E PSR note ${t}`, protectiveServicesReportKey: psr_key,
        timeSpentMinutesCount: 20, title: `PSRNote_${t}`, type: cc('25500003', 'Investigation'),
      },
    });
  }

  return configs;
}
