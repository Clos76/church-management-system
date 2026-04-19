# Test Suite

## Structure

```
test/
  services/         Unit tests for service layer
  api/              Integration tests for Route Handlers
  e2e/              End-to-end flows (registration, payment, etc.)
  fixtures/         Shared test data factories
```

## Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Convention

- Test files mirror the `src/` path: `src/lib/services/member-service.ts` → `test/services/member-service.test.ts`
- Services must be tested against a real Supabase test project, not mocks (see feedback memory)
- Every `ServiceResult` return must be asserted for both `success: true` and `success: false` paths
- Use fixtures from `test/fixtures/` rather than hardcoding test data

## Status (updated each session — last: session-003 2026-04-18, 67 tests passing)

| Module | Tests | Notes |
|--------|-------|-------|
| MemberService | ✅ 6 tests | getMembers, getMemberById, createMember, updateMember + event emission |
| RegistrationService | ✅ 5 tests | createPublicRegistration, 23505 race condition, capacity check |
| TaskService | ✅ 7 tests | createTask, completeTask, deleteTask + event emission |
| CommunicationService | ✅ 4 tests | sendEmail success/fail, email.sent emission, no profileId |
| EventBus | ✅ 5 tests | emit, on, multi-handler, error isolation, fire-and-forget |
| API: /api/users/[id] | ✅ 5 tests | 401, 403, 400 bad role, 400 missing role, 200 success |
| API: /api/communications/send | ✅ 7 tests | 401, 403, 400, 200 skipped, 200 sent, 502 Resend error |
| EventService | ✅ 10 tests | getEvents stats, capacity_remaining, getEventBySignupUrl, createEvent auth/validation, deleteEvent blocked/unauth |
| PaymentService | ✅ 10 tests | recordManualPayment (happy path, partial, zero, not found, unauth), processStripePayment (idempotent, new), deletePayment (Stripe block, manual) |
| TimelineService | ✅ 7 tests | addEntry (insert, swallows errors, defaults), getTimeline (paginated, options, empty, error) |
