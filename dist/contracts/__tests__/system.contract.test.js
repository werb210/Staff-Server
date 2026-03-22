"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const system_contract_1 = require("../system.contract");
(0, vitest_1.describe)('SYSTEM CONTRACT ENFORCEMENT', () => {
    (0, vitest_1.it)('tab order must never change', () => {
        (0, vitest_1.expect)(system_contract_1.APPLICATION_TABS).toEqual([
            'Application',
            'Financials',
            'Banking Analysis',
            'Credit Summary',
            'Documents',
            'Notes',
            'Lender Matching'
        ]);
    });
    (0, vitest_1.it)('must not use lender HQ for matching', () => {
        (0, vitest_1.expect)(system_contract_1.MATCHING_RULES.useLenderHQ).toBe(false);
    });
    (0, vitest_1.it)('documents must be immutable after acceptance', () => {
        (0, vitest_1.expect)(system_contract_1.DOCUMENT_RULES.immutableAfterAcceptance).toBe(true);
    });
});
