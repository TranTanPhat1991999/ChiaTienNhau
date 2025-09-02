// ChiaCheck - Calculation Engine

class CalculationEngine {
    constructor() {
        this.precision = 2; // Decimal places for rounding
        this.currency = 'VND';
        this.roundingMethod = 'round'; // 'round', 'floor', 'ceil'
    }
    
    // Smart calculator that can parse expressions like "2*25000"
    parseExpression(expression) {
        try {
            if (!expression || expression.trim() === '') {
                return 0;
            }
            
            // Clean the expression
            const cleanExpression = expression
                .toString()
                .replace(/[,\s]/g, '') // Remove commas and spaces
                .replace(/[^\d+\-*/().]/g, ''); // Keep only numbers and operators
            
            if (!cleanExpression) {
                return 0;
            }
            
            // Validate expression (basic security check)
            if (!this.isValidExpression(cleanExpression)) {
                throw new Error('Invalid expression');
            }
            
            // Evaluate the expression safely
            const result = this.evaluateExpression(cleanExpression);
            
            return this.roundNumber(result);
        } catch (error) {
            console.warn('Failed to parse expression:', expression, error);
            return 0;
        }
    }
    
    // Validate mathematical expression for security
    isValidExpression(expression) {
        // Only allow numbers, operators, parentheses, and decimal points
        const validPattern = /^[\d+\-*/().\s]+$/;
        
        if (!validPattern.test(expression)) {
            return false;
        }
        
        // Check for balanced parentheses
        let parenthesesCount = 0;
        for (const char of expression) {
            if (char === '(') parenthesesCount++;
            if (char === ')') parenthesesCount--;
            if (parenthesesCount < 0) return false;
        }
        
        return parenthesesCount === 0;
    }
    
    // Safely evaluate mathematical expression
    evaluateExpression(expression) {
        try {
            // Use Function constructor instead of eval for better security
            const func = new Function('return (' + expression + ')');
            const result = func();
            
            if (typeof result !== 'number' || !isFinite(result)) {
                throw new Error('Invalid result');
            }
            
            return result;
        } catch (error) {
            throw new Error('Expression evaluation failed');
        }
    }
    
    // Round number based on settings
    roundNumber(number, precision = this.precision) {
        const factor = Math.pow(10, precision);
        
        switch (this.roundingMethod) {
            case 'floor':
                return Math.floor(number * factor) / factor;
            case 'ceil':
                return Math.ceil(number * factor) / factor;
            default:
                return Math.round(number * factor) / factor;
        }
    }
    
    // Format currency for display
    formatCurrency(amount, currency = this.currency) {
        try {
            const roundedAmount = this.roundNumber(amount);
            
            switch (currency) {
                case 'VND':
                    return new Intl.NumberFormat('vi-VN').format(roundedAmount) + ' VND';
                case 'USD':
                    return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                    }).format(roundedAmount);
                case 'EUR':
                    return new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: 'EUR'
                    }).format(roundedAmount);
                default:
                    return new Intl.NumberFormat().format(roundedAmount) + ' ' + currency;
            }
        } catch (error) {
            console.warn('Currency formatting failed:', error);
            return `${amount} ${currency}`;
        }
    }
    
    // Calculate individual member costs
    calculateMemberCosts(members) {
        const memberCalculations = [];
        
        for (const member of members) {
            const calculation = {
                id: member.id,
                name: member.name,
                items: member.items || [],
                advance: this.parseExpression(member.advance) || 0,
                bankInfo: member.bankInfo || null,
                totalSpent: 0,
                itemCount: 0
            };
            
            // Calculate total spent by this member
            calculation.totalSpent = calculation.items.reduce((total, item) => {
                const itemPrice = this.parseExpression(item.price) || 0;
                return total + itemPrice;
            }, 0);
            
            calculation.itemCount = calculation.items.length;
            calculation.totalSpent = this.roundNumber(calculation.totalSpent);
            
            memberCalculations.push(calculation);
        }
        
        return memberCalculations;
    }
    
    // Calculate session totals
    calculateSessionTotals(memberCalculations) {
        const totals = {
            totalCost: 0,
            totalAdvance: 0,
            memberCount: memberCalculations.length,
            totalItems: 0,
            averageSpent: 0,
            costPerPerson: 0,
            remainingBalance: 0
        };
        
        // Calculate totals
        totals.totalCost = memberCalculations.reduce((sum, member) => 
            sum + member.totalSpent, 0
        );
        
        totals.totalAdvance = memberCalculations.reduce((sum, member) => 
            sum + member.advance, 0
        );
        
        totals.totalItems = memberCalculations.reduce((sum, member) => 
            sum + member.itemCount, 0
        );
        
        // Calculate per-person amounts
        if (totals.memberCount > 0) {
            totals.costPerPerson = totals.totalCost / totals.memberCount;
            totals.averageSpent = totals.totalCost / totals.memberCount;
        }
        
        totals.remainingBalance = totals.totalCost - totals.totalAdvance;
        
        // Round all values
        Object.keys(totals).forEach(key => {
            if (typeof totals[key] === 'number') {
                totals[key] = this.roundNumber(totals[key]);
            }
        });
        
        return totals;
    }
    
    // Calculate final amounts for each member
    calculateFinalAmounts(memberCalculations, totals) {
        return memberCalculations.map(member => {
            const calculation = { ...member };
            
            // Amount this person should pay based on equal split
            calculation.amountPerPerson = totals.costPerPerson;
            
            // Final amount = Cost per person - Advance paid
            calculation.finalAmount = calculation.amountPerPerson - calculation.advance;
            
            // Determine status
            if (Math.abs(calculation.finalAmount) < 0.01) {
                calculation.status = 'even';
                calculation.finalAmount = 0;
            } else if (calculation.finalAmount > 0) {
                calculation.status = 'needs_to_pay';
            } else {
                calculation.status = 'gets_refund';
                calculation.finalAmount = Math.abs(calculation.finalAmount);
            }
            
            // Round final amount
            calculation.finalAmount = this.roundNumber(calculation.finalAmount);
            calculation.amountPerPerson = this.roundNumber(calculation.amountPerPerson);
            
            return calculation;
        });
    }
    
    // Main calculation function
    calculateSession(session) {
        try {
            if (!session || !session.members || session.members.length === 0) {
                return {
                    memberCalculations: [],
                    totals: this.calculateSessionTotals([]),
                    summary: this.generateSummary([], this.calculateSessionTotals([]))
                };
            }
            
            // Step 1: Calculate individual member costs
            const memberCalculations = this.calculateMemberCosts(session.members);
            
            // Step 2: Calculate session totals
            const totals = this.calculateSessionTotals(memberCalculations);
            
            // Step 3: Calculate final amounts
            const finalCalculations = this.calculateFinalAmounts(memberCalculations, totals);
            
            // Step 4: Generate summary
            const summary = this.generateSummary(finalCalculations, totals);
            
            // Step 5: Validate calculations
            this.validateCalculations(finalCalculations, totals);
            
            return {
                memberCalculations: finalCalculations,
                totals,
                summary
            };
        } catch (error) {
            console.error('Calculation failed:', error);
            throw new Error('Failed to calculate session: ' + error.message);
        }
    }
    
    // Generate calculation summary
    generateSummary(memberCalculations, totals) {
        const summary = {
            needToPay: [],
            getRefund: [],
            even: [],
            totalNeedToPay: 0,
            totalRefund: 0,
            balanceCheck: 0
        };
        
        memberCalculations.forEach(member => {
            switch (member.status) {
                case 'needs_to_pay':
                    summary.needToPay.push({
                        name: member.name,
                        amount: member.finalAmount
                    });
                    summary.totalNeedToPay += member.finalAmount;
                    break;
                case 'gets_refund':
                    summary.getRefund.push({
                        name: member.name,
                        amount: member.finalAmount
                    });
                    summary.totalRefund += member.finalAmount;
                    break;
                case 'even':
                    summary.even.push({
                        name: member.name,
                        amount: 0
                    });
                    break;
            }
        });
        
        // Round summary amounts
        summary.totalNeedToPay = this.roundNumber(summary.totalNeedToPay);
        summary.totalRefund = this.roundNumber(summary.totalRefund);
        summary.balanceCheck = this.roundNumber(summary.totalNeedToPay - summary.totalRefund);
        
        return summary;
    }
    
    // Validate that calculations are balanced
    validateCalculations(memberCalculations, totals) {
        // Check that total advances + amounts to pay = total cost
        const totalAdvances = memberCalculations.reduce((sum, m) => sum + m.advance, 0);
        const totalNeedToPay = memberCalculations
            .filter(m => m.status === 'needs_to_pay')
            .reduce((sum, m) => sum + m.finalAmount, 0);
        
        const calculatedTotal = totalAdvances + totalNeedToPay;
        const difference = Math.abs(calculatedTotal - totals.totalCost);
        
        if (difference > 0.01) { // Allow for small rounding differences
            console.warn('Calculation validation failed:', {
                totalCost: totals.totalCost,
                calculatedTotal,
                difference
            });
        }
        
        return difference <= 0.01;
    }
    
    // Split bill with custom percentages
    calculateCustomSplit(session, percentages) {
        try {
            if (!session || !session.members || !percentages) {
                throw new Error('Invalid parameters for custom split');
            }
            
            // Validate percentages sum to 100
            const totalPercentage = Object.values(percentages).reduce((sum, p) => sum + p, 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                throw new Error('Percentages must sum to 100%');
            }
            
            const memberCalculations = this.calculateMemberCosts(session.members);
            const totals = this.calculateSessionTotals(memberCalculations);
            
            // Apply custom percentages
            const customCalculations = memberCalculations.map(member => {
                const calculation = { ...member };
                const percentage = percentages[member.id] || 0;
                
                calculation.amountPerPerson = (totals.totalCost * percentage) / 100;
                calculation.finalAmount = calculation.amountPerPerson - calculation.advance;
                
                // Determine status
                if (Math.abs(calculation.finalAmount) < 0.01) {
                    calculation.status = 'even';
                    calculation.finalAmount = 0;
                } else if (calculation.finalAmount > 0) {
                    calculation.status = 'needs_to_pay';
                } else {
                    calculation.status = 'gets_refund';
                    calculation.finalAmount = Math.abs(calculation.finalAmount);
                }
                
                calculation.finalAmount = this.roundNumber(calculation.finalAmount);
                calculation.amountPerPerson = this.roundNumber(calculation.amountPerPerson);
                
                return calculation;
            });
            
            const summary = this.generateSummary(customCalculations, totals);
            
            return {
                memberCalculations: customCalculations,
                totals,
                summary
            };
        } catch (error) {
            console.error('Custom split calculation failed:', error);
            throw error;
        }
    }
    
    // Calculate tip distribution
    calculateWithTip(session, tipAmount, tipDistribution = 'equal') {
        try {
            const tipValue = this.parseExpression(tipAmount) || 0;
            
            if (tipValue <= 0) {
                return this.calculateSession(session);
            }
            
            // Create a copy of the session with tip added
            const sessionWithTip = JSON.parse(JSON.stringify(session));
            
            if (tipDistribution === 'equal') {
                // Add tip equally to all members
                const tipPerPerson = tipValue / sessionWithTip.members.length;
                
                sessionWithTip.members.forEach(member => {
                    if (!member.items) member.items = [];
                    member.items.push({
                        name: 'Tip (Equal Split)',
                        price: tipPerPerson
                    });
                });
            } else if (tipDistribution === 'proportional') {
                // Add tip proportional to individual spending
                const memberCalculations = this.calculateMemberCosts(session.members);
                const totalSpent = memberCalculations.reduce((sum, m) => sum + m.totalSpent, 0);
                
                if (totalSpent > 0) {
                    sessionWithTip.members.forEach((member, index) => {
                        const memberSpent = memberCalculations[index].totalSpent;
                        const tipForMember = (memberSpent / totalSpent) * tipValue;
                        
                        if (!member.items) member.items = [];
                        member.items.push({
                            name: 'Tip (Proportional)',
                            price: tipForMember
                        });
                    });
                }
            }
            
            return this.calculateSession(sessionWithTip);
        } catch (error) {
            console.error('Tip calculation failed:', error);
            throw error;
        }
    }
    
    // Generate payment suggestions (who should pay whom)
    generatePaymentSuggestions(calculations) {
        try {
            const needToPay = calculations.memberCalculations
                .filter(m => m.status === 'needs_to_pay')
                .map(m => ({ name: m.name, amount: m.finalAmount }))
                .sort((a, b) => b.amount - a.amount);
            
            const getRefund = calculations.memberCalculations
                .filter(m => m.status === 'gets_refund')
                .map(m => ({ name: m.name, amount: m.finalAmount }))
                .sort((a, b) => b.amount - a.amount);
            
            const suggestions = [];
            let payIndex = 0;
            let refundIndex = 0;
            
            while (payIndex < needToPay.length && refundIndex < getRefund.length) {
                const payer = needToPay[payIndex];
                const receiver = getRefund[refundIndex];
                
                const transferAmount = Math.min(payer.amount, receiver.amount);
                
                if (transferAmount > 0.01) { // Ignore tiny amounts
                    suggestions.push({
                        from: payer.name,
                        to: receiver.name,
                        amount: this.roundNumber(transferAmount),
                        formattedAmount: this.formatCurrency(transferAmount)
                    });
                }
                
                payer.amount -= transferAmount;
                receiver.amount -= transferAmount;
                
                if (payer.amount <= 0.01) payIndex++;
                if (receiver.amount <= 0.01) refundIndex++;
            }
            
            return suggestions;
        } catch (error) {
            console.error('Payment suggestions generation failed:', error);
            return [];
        }
    }
    
    // Export calculations to various formats
    exportCalculations(calculations, format = 'summary') {
        try {
            switch (format) {
                case 'summary':
                    return this.exportSummary(calculations);
                case 'detailed':
                    return this.exportDetailed(calculations);
                case 'csv':
                    return this.exportCSV(calculations);
                default:
                    return this.exportSummary(calculations);
            }
        } catch (error) {
            console.error('Export failed:', error);
            return '';
        }
    }
    
    exportSummary(calculations) {
        const { totals, summary } = calculations;
        let text = 'BILL SPLITTING SUMMARY\n';
        text += '=' * 30 + '\n\n';
        
        text += `Total Cost: ${this.formatCurrency(totals.totalCost)}\n`;
        text += `Total Members: ${totals.memberCount}\n`;
        text += `Cost Per Person: ${this.formatCurrency(totals.costPerPerson)}\n`;
        text += `Total Advance: ${this.formatCurrency(totals.totalAdvance)}\n\n`;
        
        if (summary.needToPay.length > 0) {
            text += 'NEED TO PAY:\n';
            summary.needToPay.forEach(item => {
                text += `  ${item.name}: ${this.formatCurrency(item.amount)}\n`;
            });
            text += '\n';
        }
        
        if (summary.getRefund.length > 0) {
            text += 'GET REFUND:\n';
            summary.getRefund.forEach(item => {
                text += `  ${item.name}: ${this.formatCurrency(item.amount)}\n`;
            });
            text += '\n';
        }
        
        if (summary.even.length > 0) {
            text += 'ALL EVEN:\n';
            summary.even.forEach(item => {
                text += `  ${item.name}\n`;
            });
        }
        
        return text;
    }
    
    exportDetailed(calculations) {
        let text = this.exportSummary(calculations);
        text += '\n\nDETAILED BREAKDOWN:\n';
        text += '=' * 30 + '\n\n';
        
        calculations.memberCalculations.forEach(member => {
            text += `${member.name}:\n`;
            text += `  Items (${member.itemCount}):\n`;
            
            member.items.forEach(item => {
                text += `    ${item.name}: ${this.formatCurrency(item.price)}\n`;
            });
            
            text += `  Total Spent: ${this.formatCurrency(member.totalSpent)}\n`;
            text += `  Advance Paid: ${this.formatCurrency(member.advance)}\n`;
            text += `  Should Pay: ${this.formatCurrency(member.amountPerPerson)}\n`;
            text += `  Final Amount: ${this.formatCurrency(member.finalAmount)} (${member.status})\n\n`;
        });
        
        return text;
    }
    
    exportCSV(calculations) {
        let csv = 'Name,Items Count,Total Spent,Advance Paid,Should Pay,Final Amount,Status\n';
        
        calculations.memberCalculations.forEach(member => {
            csv += `"${member.name}",${member.itemCount},${member.totalSpent},${member.advance},${member.amountPerPerson},${member.finalAmount},"${member.status}"\n`;
        });
        
        return csv;
    }
}

// Utility functions for number formatting and parsing
class NumberUtils {
    static parseNumber(input) {
        if (typeof input === 'number') return input;
        if (!input) return 0;
        
        // Remove currency symbols and spaces
        const cleaned = input.toString()
            .replace(/[^\d+\-*/().,]/g, '')
            .replace(/,/g, '');
        
        return parseFloat(cleaned) || 0;
    }
    
    static formatNumber(number, decimals = 0) {
        return new Intl.NumberFormat('vi-VN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(number);
    }
    
    static formatPercentage(decimal) {
        return (decimal * 100).toFixed(1) + '%';
    }
    
    static isValidNumber(input) {
        const number = this.parseNumber(input);
        return !isNaN(number) && isFinite(number);
    }
}

// Create global calculation engine instance
window.calculationEngine = new CalculationEngine();
window.NumberUtils = NumberUtils;
