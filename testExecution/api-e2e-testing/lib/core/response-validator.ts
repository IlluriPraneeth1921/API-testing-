/**
 * Response Validator — validates API responses against Excel expectations.
 *
 * Three validation types:
 *   1. Status code (exact match)
 *   2. UserMessage (exact, semicolon-separated, checks each is present)
 *   3. RecordCount ("Greater Than or Equals to 1", "0", "5", etc.)
 */

import { expect } from '@playwright/test';

export interface ValidationResult {
  passed: boolean;
  details: string;
}

// ── Status Code ──

export function validateStatus(actual: number, expected: number): ValidationResult {
  const passed = actual === expected;
  return {
    passed,
    details: passed ? `Status ${actual} ✓` : `Expected ${expected}, got ${actual}`,
  };
}

// ── UserMessage ──

export function validateUserMessage(responseBody: any, expectedMessages: string): ValidationResult {
  if (!expectedMessages || expectedMessages === 'No Message') {
    return { passed: true, details: 'No message validation needed' };
  }

  const actual = extractMessages(responseBody);
  const expected = expectedMessages.split(';').map(m => m.trim()).filter(Boolean);
  const missing: string[] = [];

  for (const msg of expected) {
    const found = actual.some(a =>
      a === msg || a.includes(msg) || msg.includes(a)
    );
    if (!found) missing.push(msg);
  }

  const passed = missing.length === 0;
  return {
    passed,
    details: passed
      ? `All ${expected.length} message(s) matched`
      : `Missing: ${missing.join(' | ')} — Actual: ${actual.join(' | ')}`,
  };
}

function extractMessages(body: any): string[] {
  if (!body) return [];

  // Pattern 1: body.responseMessages[].userMessage or .value
  if (body.responseMessages && Array.isArray(body.responseMessages)) {
    return body.responseMessages
      .map((rm: any) => rm.userMessage || rm.value || rm.message || '')
      .filter(Boolean);
  }

  // Pattern 2: body.model.responseMessages
  if (body.model?.responseMessages && Array.isArray(body.model.responseMessages)) {
    return body.model.responseMessages
      .map((rm: any) => rm.userMessage || rm.value || rm.message || '')
      .filter(Boolean);
  }

  // Pattern 3: body.message (single string)
  if (body.message && typeof body.message === 'string') {
    return [body.message];
  }

  // Pattern 4: body.errors (validation errors object)
  if (body.errors && typeof body.errors === 'object') {
    return Object.values(body.errors).flat().map(String).filter(Boolean);
  }

  // Pattern 5: body.title (ASP.NET problem details)
  if (body.title && typeof body.title === 'string') {
    return [body.title];
  }

  return [];
}

// ── RecordCount ──

export function validateRecordCount(responseBody: any, expected: string): ValidationResult {
  const count = extractCount(responseBody);

  const lower = expected.toLowerCase().trim();

  // "Greater Than or Equals to N"
  const gteMatch = lower.match(/greater\s+than\s+or\s+equals?\s+to\s+(\d+)/);
  if (gteMatch) {
    const n = parseInt(gteMatch[1]);
    const passed = count >= n;
    return { passed, details: passed ? `Count ${count} >= ${n} ✓` : `Count ${count} < ${n}` };
  }

  // "Greater Than N"
  const gtMatch = lower.match(/greater\s+than\s+(\d+)/);
  if (gtMatch) {
    const n = parseInt(gtMatch[1]);
    const passed = count > n;
    return { passed, details: passed ? `Count ${count} > ${n} ✓` : `Count ${count} <= ${n}` };
  }

  // Exact number
  const n = parseInt(expected);
  if (!isNaN(n)) {
    const passed = count === n;
    return { passed, details: passed ? `Count ${count} === ${n} ✓` : `Count ${count} !== ${n}` };
  }

  return { passed: false, details: `Unknown count expression: "${expected}"` };
}

function extractCount(body: any): number {
  if (!body) return 0;

  // Paged response: model.items + pagingData.totalCount
  if (body.model?.items && Array.isArray(body.model.items)) {
    return body.model.pagingData?.totalCount ?? body.model.items.length;
  }

  // model is array
  if (Array.isArray(body.model)) return body.model.length;

  // items at root
  if (body.items && Array.isArray(body.items)) {
    return body.pagingData?.totalCount ?? body.items.length;
  }

  // body itself is array
  if (Array.isArray(body)) return body.length;

  // Single object with a key → count as 1
  if (body && typeof body === 'object' && Object.keys(body).length > 0) return 1;

  return 0;
}

// ── Assertion helpers (for use in spec) ──

export function assertStatus(actual: number, expected: number, label: string): void {
  expect(actual, `${label}: status`).toBe(expected);
}

export function assertUserMessage(body: any, expected: string, label: string): void {
  if (!expected || expected === 'No Message') return;
  const result = validateUserMessage(body, expected);
  expect(result.passed, `${label}: ${result.details}`).toBeTruthy();
}

export function assertRecordCount(body: any, expected: string, label: string): void {
  const result = validateRecordCount(body, expected);
  expect(result.passed, `${label}: ${result.details}`).toBeTruthy();
}
