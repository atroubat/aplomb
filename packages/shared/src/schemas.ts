/**
 * @budgetfoyer/shared — Zod schemas shared between backend and frontend.
 *
 * Both packages import from here so that validation logic and inferred types
 * stay in sync with zero duplication. The backend uses these schemas for
 * request body validation; the frontend imports the inferred TypeScript types.
 */
import { z } from 'zod';

// ── Primitives ─────────────────────────────────────────────────────────────────

export const FrequencySchema = z.enum(['monthly', 'quarterly', 'yearly']);
export type Frequency = z.infer<typeof FrequencySchema>;

export const AccountTypeSchema = z.enum(['checking', 'savings', 'investment']);
export type AccountType = z.infer<typeof AccountTypeSchema>;

export const SavingsTypeSchema = z.enum(['livret', 'pea', 'assurance_vie', 'crypto', 'other']);
export type SavingsType = z.infer<typeof SavingsTypeSchema>;

export const FixedChargeCategorySchema = z.enum([
  'housing', 'energy', 'food', 'insurance', 'credit',
  'subscription', 'tax', 'transport', 'health', 'childcare', 'other',
]);
export type FixedChargeCategory = z.infer<typeof FixedChargeCategorySchema>;

export const PersonalChargeCategorySchema = z.enum([
  'health', 'sport', 'subscription', 'transport', 'education',
  'food', 'clothing', 'credit', 'telecom', 'other',
]);
export type PersonalChargeCategory = z.infer<typeof PersonalChargeCategorySchema>;

// ── Entity schemas (write payloads) ────────────────────────────────────────────

export const PersonSchema = z.object({
  name: z.string().min(1),
  color: z.string().min(1),
  avatar: z.string().optional().nullable(),
});

export const AccountSchema = z.object({
  name: z.string().min(1),
  type: AccountTypeSchema,
  personId: z.number().int().positive().optional().nullable(),
  initialBalance: z.number().optional().default(0),
  icon: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
});

export const IncomeSchema = z.object({
  personId: z.number().int().positive(),
  label: z.string().min(1),
  amount: z.number().positive(),
  frequency: FrequencySchema,
  accountId: z.number().int().positive().optional().nullable(),
  isActive: z.number().int().min(0).max(1).optional().default(1),
  isVariable: z.number().int().min(0).max(1).optional().default(0),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export const IncomeOverrideSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  amount: z.number().min(0),
  note: z.string().optional().nullable(),
});

export const FixedChargeSchema = z.object({
  label: z.string().min(1),
  amount: z.number().positive(),
  category: FixedChargeCategorySchema,
  frequency: FrequencySchema,
  accountId: z.number().int().positive().optional().nullable(),
  isActive: z.number().int().min(0).max(1).optional().default(1),
  isSmoothed: z.number().int().min(0).max(1).optional().default(1),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export const PersonalChargeSchema = z.object({
  personId: z.number().int().positive(),
  label: z.string().min(1),
  amount: z.number().positive(),
  category: PersonalChargeCategorySchema,
  frequency: FrequencySchema,
  accountId: z.number().int().positive().optional().nullable(),
  isActive: z.number().int().min(0).max(1).optional().default(1),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export const SavingsSchema = z.object({
  label: z.string().min(1),
  type: SavingsTypeSchema,
  targetAmount: z.number().positive().optional().nullable(),
  targetDate: z.string().optional().nullable(),
  accountId: z.number().int().positive().optional().nullable(),
  personId: z.number().int().positive().optional().nullable(),
  isCommon: z.number().int().min(0).max(1).optional().default(0),
  hostedByPersonId: z.number().int().positive().optional().nullable(),
});

export const SavingsTransactionSchema = z.object({
  type: z.enum(['deposit', 'withdrawal']),
  amount: z.number().positive(),
  date: z.string(),
  reason: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const TransferSchema = z.object({
  fromAccountId: z.number().int().positive(),
  toAccountId: z.number().int().positive(),
  amount: z.number().positive(),
  date: z.string(),
  label: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

export const ActualExpenseSchema = z.object({
  personId: z.number().int().positive().optional().nullable(),
  category: z.string().min(1),
  amount: z.number().min(0),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  label: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
});

// ── Read models (DB rows returned to frontend) ─────────────────────────────────
// These represent what the API returns, not what it receives.

export const PersonRowSchema = PersonSchema.extend({ id: z.number(), created_at: z.string().optional() });
export type PersonRow = z.infer<typeof PersonRowSchema>;

export const AccountRowSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: AccountTypeSchema,
  person_id: z.number().nullable(),
  initial_balance: z.number(),
  icon: z.string().nullable(),
  iban: z.string().nullable(),
  created_at: z.string().optional(),
});
export type AccountRow = z.infer<typeof AccountRowSchema>;

export const TransferRowSchema = z.object({
  id: z.number(),
  from_account_id: z.number(),
  to_account_id: z.number(),
  amount: z.number(),
  date: z.string(),
  label: z.string().nullable(),
  note: z.string().nullable(),
  created_at: z.string().optional(),
});
export type TransferRow = z.infer<typeof TransferRowSchema>;

export const ActualExpenseRowSchema = z.object({
  id: z.number(),
  person_id: z.number().nullable(),
  category: z.string(),
  amount: z.number(),
  year: z.number(),
  month: z.number(),
  label: z.string().nullable(),
  note: z.string().nullable(),
  created_at: z.string().optional(),
});
export type ActualExpenseRow = z.infer<typeof ActualExpenseRowSchema>;
