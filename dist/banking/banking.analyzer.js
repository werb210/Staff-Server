"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankingAnalyzer = void 0;
class BankingAnalyzer {
    parseTransactions(rawText) {
        const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        const transactions = [];
        lines.forEach((line) => {
            const match = line.match(/(\d{4}-\d{2}-\d{2})\s+(.+?)\s+(-?\d+\.\d{2})\s+(-?\d+\.\d{2})\s+(-?\d+\.\d{2})/);
            if (match) {
                const [, date, description, debit, credit, balance] = match;
                transactions.push({
                    date,
                    description,
                    debit: Math.max(parseFloat(debit) * -1, 0),
                    credit: Math.max(parseFloat(credit), 0),
                    balance: parseFloat(balance),
                });
            }
        });
        return transactions;
    }
    categorize(transactions) {
        const credits = transactions.filter((t) => t.credit > 0);
        const debits = transactions.filter((t) => t.debit > 0);
        const payroll = credits.filter((t) => /payroll|salary/i.test(t.description));
        const nsf_events = debits.filter((t) => /nsf|insufficient/i.test(t.description));
        const transfers = transactions.filter((t) => /transfer/i.test(t.description));
        const loan_payments = debits.filter((t) => /loan/i.test(t.description));
        return { credits, debits, payroll, nsf_events, transfers, loan_payments };
    }
    computeMetrics(transactions) {
        const byMonth = new Map();
        transactions.forEach((t) => {
            const month = t.date.slice(0, 7);
            if (!byMonth.has(month))
                byMonth.set(month, []);
            byMonth.get(month)?.push(t);
        });
        const months = Array.from(byMonth.keys()).sort();
        const revenues = months.map((m) => byMonth.get(m)?.reduce((acc, t) => acc + t.credit, 0) ?? 0);
        const expenses = months.map((m) => byMonth.get(m)?.reduce((acc, t) => acc + t.debit, 0) ?? 0);
        const averageMonthlyRevenue = revenues.length ? revenues.reduce((a, b) => a + b, 0) / revenues.length : 0;
        const averageMonthlyExpenses = expenses.length ? expenses.reduce((a, b) => a + b, 0) / expenses.length : 0;
        const burnRate = averageMonthlyExpenses - averageMonthlyRevenue;
        const latestBalance = transactions[transactions.length - 1]?.balance ?? 0;
        const dailyBurn = averageMonthlyExpenses / 30;
        const daysCashOnHand = dailyBurn ? Math.max(Math.floor(latestBalance / dailyBurn), 0) : 0;
        const nsfCount = transactions.filter((t) => /nsf|insufficient/i.test(t.description)).length;
        const monthToMonthRevenueTrend = revenues.slice(-6);
        const sortedDeposits = transactions
            .filter((t) => t.credit > 0)
            .map((t) => t.credit)
            .sort((a, b) => b - a);
        const largestDepositsValues = sortedDeposits.slice(0, 5);
        const volatilityIndex = revenues.length ? this.stdDev(revenues) : 0;
        return {
            averageMonthlyRevenue,
            averageMonthlyExpenses,
            burnRate,
            daysCashOnHand,
            nsfCount,
            monthToMonthRevenueTrend,
            largestDeposits: largestDepositsValues,
            volatilityIndex,
        };
    }
    monthlyBreakdown(transactions) {
        const breakdown = {};
        transactions.forEach((t) => {
            const month = t.date.slice(0, 7);
            breakdown[month] = breakdown[month] || [];
            breakdown[month].push(t);
        });
        return breakdown;
    }
    stdDev(values) {
        if (!values.length)
            return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }
}
exports.BankingAnalyzer = BankingAnalyzer;
