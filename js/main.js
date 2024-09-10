document.addEventListener("DOMContentLoaded", function() {
    const form = document.querySelector('form');
    const inputs = form.querySelectorAll('input, select');
    const minRunway = 12;
    const runwayThreshold = 60;
    let isNearProfitableCompany = false;
    let isProfitableCompany = false;
    let isGrowthCompany = false;
    const growthThreshold = 5000000 // 5m yearly negative cash burn
    const corporateTaxRate = 0.25 // 25% assumed for European countries

    // Function to format the input value as currency
    function formatCurrencyInputOnBlur(event) {
        const input = event.target;
        const value = parseFloat(input.value.replace(/,/g, ''));
        if (!isNaN(value) && input.value !== '') {
            input.value = value.toLocaleString('en-US', { maximumFractionDigits: 0 });
        }
    }

    // Function to handle input changes
    function handleCurrencyInputChange(event) {
        const input = event.target;
        const cursorPosition = input.selectionStart;
        
        // Get the value without commas
        const rawValue = input.value.replace(/,/g, '');
        
        // Insert the comma at the cursor position if needed
        const valueWithCommas = parseFloat(rawValue).toLocaleString('en-US', { maximumFractionDigits: 0 });
        
        // Set the formatted value
        input.value = rawValue;

        // Restore the cursor position
        input.setSelectionRange(cursorPosition, cursorPosition);
    }

    // Function to remove commas on focus
    function removeCommasOnFocus(event) {
        const input = event.target;
        input.value = input.value.replace(/,/g, '');
    }

    function validatePercentageInput(event) {
        const input = event.target;
        let value = input.value.replace('%', '');
        
        // Allow only numbers
        if (!/^\d*\.?\d*$/.test(value)) {
            value = value.replace(/[^\d.]/g, '');
        }

        // Ensure percentage sign is present
        input.value = value + '%';

        // Move cursor to the left of the percentage sign if necessary
        if (input.selectionStart > input.value.length - 1) {
            input.setSelectionRange(input.value.length - 1, input.value.length - 1);
        }

        if (input.value === '%') {
            input.value = null;
        }
    }

    function handleCursorMove(event) {
        const input = event.target;
        // Move cursor to the left of the percentage sign if necessary
        if (input.selectionStart > input.value.length - 1) {
            input.setSelectionRange(input.value.length - 1, input.value.length - 1);
        }
    }

    function captureValues() {
        const values = {};
        let hasError = false;

        inputs.forEach(input => {
            const isValid = isInputValid(input); // Validate each input

            if (!isValid) {
                hasError = true; // Flag that an error exists
            }

            if (input.classList.contains('number-input')) {
                values[input.name] = input.value ? parseFloat(input.value.replace(/,/g, '')) || 0 : null;
            } else if (input.type === 'text' && input.value.includes('%')) {
                const trimmedValue = input.value.trim();
                values[input.name] = (trimmedValue === '' || trimmedValue === '%') ? null : parseFloat(trimmedValue) / 100;
            } else if (input.type === 'select-one' && input.name === 'klymb_advisory_service') {
                values[input.name] = input.value === 'Yes';
            } else {
                values[input.name] = input.value ? input.value : null;
            }
        });

        if (hasError) {
            throw new Error('Input error.');
        }

        return values;
    }

    //////////////////
    // Validate inputs
    //////////////////

    function hasNullValues(values) {
        for (const key in values) {
            if (values[key] === null) {
                return true;
            }
        }
        return false;
    }

    function isInputValid(input) {
        let value = input.value;
    
        // Skip validation if the field is empty
        if (value === '') {
            input.classList.remove('input-error'); // Ensure the error class is removed if the input is empty
            return true; // Return true or handle as needed for empty fields
        }
    
        if (input.classList.contains('number-input')) {
            value = value.replace(/,/g, ''); // Remove commas for number fields
        } else if (input.classList.contains('percentage-input')) {
            value = value.replace(/,/g, '').replace('%', ''); // Remove commas and % for percentage fields
        } else {
            return true; // Input type not handled yet
        }
    
        // Special handling for cash_burn field to allow negative values
        if (input.id === 'cash_burn') {
            if (!/^-?\d*\.?\d+$/.test(value)) { // Allow for negative and decimal numbers
                input.classList.add('input-error'); // Add error class if invalid
                console.log(`Invalid value in field "${input.name}": ${input.value}`);
                return false;
            }
        } else {
            // General check for other fields to allow only positive numbers
            if (!/^\d*\.?\d+$/.test(value)) { // Allow for decimal numbers
                input.classList.add('input-error'); // Add the error class to the invalid input field
                console.log(`Invalid value in field "${input.name}": ${input.value}`);
                return false;
            }
        }
    
        // If the value is valid, remove any error class
        input.classList.remove('input-error');
        return true;
    }

    function triggerLowRunwayAlert() {
        const runway = parseFloat(runwayInput.value);
        if (runway !== null && runway < 12 && !isNearProfitableCompany) {
            showElement('runway-container');
        } else {
            hideElement('runway-container');
        }
    }

    function triggerHighRunwayAlert(newRunway, forceTrigger=false) {
        let isHighRunway = false
        if ((newRunway !== null && newRunway > runwayThreshold) || forceTrigger) {
            isNearProfitableCompany = true;
            hideElement('additionalRunway', focusParent=true);
            hideElement('increasedValuation', focusParent=true);
            hideElement('cost_comparison_chart');
            hideElement('retained_valuation_gap_chart');
            hideElement('afterTaxCostOfDebt', focusParent=true);
            isHighRunway = true
        } else {
            isNearProfitableCompany = false;
            showElement('additionalRunway', focusParent=true);
            showElement('increasedValuation', focusParent=true);
            showElement('cost_comparison_chart');
            showElement('retained_valuation_gap_chart');
            hideElement('afterTaxCostOfDebt', focusParent=true);
        }

        if (isProfitableCompany) {
            showElement('afterTaxCostOfDebt', focusParent=true);
            isHighRunway = true
        } else {
            hideElement('afterTaxCostOfDebt', focusParent=true);
        }

        if (isGrowthCompany) {
            showElement('growth-container');
            isHighRunway = true
        } else {
            hideElement('growth-container');
        }

        return isHighRunway
    }

    function triggerDebtAlert(current_debt, amount) {
        if (current_debt !== null && amount === 0) {
            showElement('debt-container');
        } else {
            hideElement('debt-container');
        }
    }

    function calculateDebtRange(arr) {
        const debtAmountMin = 0.5 * arr;
        const debtAmountMax = 1.5 * arr;
        return { debtAmountMin, debtAmountMax };
    }

    function calculateBurnMultiple(arr, cash_burn, revenue_growth) {
        const arrIncrease = arr * revenue_growth / 12
        const burnMultiple = cash_burn / arrIncrease
        return burnMultiple
    }

    function scoreBooster(score, booster=0) {
        return Math.min(1, score * (1 + booster))
    }

    function sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }
    
    function sigmoidAdjusted(value, minVal, maxVal, curveCoef = 10) {
        // return 1 if no range
        if (minVal === maxVal) {
            return 1;
        }
    
        // If reversed scale with minVal > maxVal, get the inverse of all values
        if (minVal > maxVal) {
            value = -value;
            minVal = -minVal;
            maxVal = -maxVal;
        }
    
        // Normalize the input value to a range suitable for the sigmoid function
        // This is an optional step to adjust the spread of the sigmoid function.
        // You can modify the factor to control the spread.
        const normalizedValue = curveCoef * (value - minVal) / (maxVal - minVal) - curveCoef / 2;
    
        // Apply the sigmoid function
        return sigmoid(normalizedValue);
    }

    function roundToSignificantDigits(value, significantDigits = null) {
        // Handle limit cases
        if (value === 0) {
            return value;
        }

        // If significantDigits is null, calculate it as the length of the number - 2
        if (significantDigits === null) {
            significantDigits = Math.floor(Math.log10(value)) - 1;
        }
    
        // Calculate the rounding factor
        const factor = Math.pow(10, significantDigits);
        // Round the value to the nearest significant digit
        return Math.round(value / factor) * factor;
    }

    function calculateScore(values) {
        const {
            revenue_growth,
            gross_margin,
            cash_burn,
            current_runway,
            current_valuation,
            current_ownership,
            arr
        } = values;

        let score = 0;
        score += sigmoidAdjusted(revenue_growth, 0.3, 1.2) * 30; // Revenue growth weighted at 20%
        score += sigmoidAdjusted(gross_margin, .5, .9) * 10; // Gross margin weighted at 20%
        score += sigmoidAdjusted(current_valuation / arr, 5, 12) * 20; // Valuation weighted at 20%
        if (isNearProfitableCompany) {
            score += 10; // Runway weighted at 10%
        } else {
            score += sigmoidAdjusted(current_runway, 10, 18) * 10; // Runway weighted at 10%
        }

        // Get the minimum score between the ruleof40 and the burnMultiple to accomodate profitable businesses as well
        let cashBurnScore = 0;
        if (cash_burn <= 0) {
            cashBurnScore = 1;
        } else {
            cashBurnScore = calculateBurnScore(arr, calculateBurnMultiple(arr, cash_burn, revenue_growth)); // Burn multiple weighted at 20%
        }
        const ruleOf40 = calculateRuleOf40(arr, revenue_growth, cash_burn);
        const ruleOf40Score = ruleOf40ProxyScore(ruleOf40);
        score += Math.min(cashBurnScore, ruleOf40Score) * 30;

        // Normalize score to 0-1 range
        score = Math.max(0, Math.min(1, score / 100));
        return score;
    }

    function calculateBurnScore(arr, burn_multiple) {
        // Based on a16z evaluation https://a16z.com/a-framework-for-navigating-down-markets/
        let lower, upper;
    
        switch (true) {
            case arr >= 0 && arr <= 10000000: // $0 - $10M
                lower = 3.8;
                upper = 1.1;
                break;
    
            case arr > 10000000 && arr <= 25000000: // $10M - $25M
                lower = 1.8;
                upper = 0.8;
                break;
    
            case arr > 25000000 && arr <= 75000000: // $25M - $75M
                lower = 1.1;
                upper = 0.5;
                break;
    
            case arr > 75000000: // $75M+
                lower = 0.9;
                upper = 0;
                break;
    
            default:
                throw new Error("Invalid ARR range");
        }
    
        return sigmoidAdjusted(burn_multiple, lower, upper);
    }

    function calculateRuleOf40(arr, monthlyGrowthRate, monthlyCashBurn) {
        // Step 1: Calculate the Annual Growth Rate from the Monthly Growth Rate
        const annualGrowthRate = Math.pow(1 + monthlyGrowthRate, 12) - 1;
    
        // Step 2: Calculate the Cash Flow Margin
        const cashFlowMargin = monthlyCashBurn / (arr / 12);
    
        // Step 3: Calculate the Rule of 40 proxy (sum of annual growth rate and cash flow margin)
        const ruleOf40 = annualGrowthRate + cashFlowMargin;
    
        return ruleOf40;
    }

    function ruleOf40ProxyScore(ruleOf40) {
        let score = 0;
    
        switch (true) {
            case (ruleOf40 < 20):
                score = 0; // Below 20% considered poor performance
                break;
            case (ruleOf40 <= 40):
                score = ((ruleOf40 - 20) / (40 - 20)) * 0.6; // Normalize between 0 and 0.6
                break;
            case (ruleOf40 <= 60):
                score = 0.6 + ((ruleOf40 - 40) / (60 - 40)) * 0.4; // Normalize between 0.6 and 1
                break;
            default:
                score = 1; // Above 60% considered excellent performance
        }
    
        return score;
    }

    function calculateDebtParam(score, min, max, step = null, reverseScale = false, isPercentage = false, isInteger = false) {
        let result;
        if (reverseScale) {
            result = min + (1 - score) * (max - min);
        } else {
            result = min + score * (max - min);
        }
    
        if (isPercentage) {
            result = parseFloat(result.toFixed(4));
        }
    
        if (isInteger) {
            result = Math.round(result);
        }

        if (step !== null) {
            result = Math.round(result / step) * step;
        }
    
        return result;
    }

    function afterTaxCostOfDebt(interestRate, arrangementFees, exitFees, loanDuration) {
        // Calculate the after-tax cost of debt
        const afterTaxCost = (interestRate + arrangementFees/loanDuration + exitFees/loanDuration) * (1 - corporateTaxRate);
        return afterTaxCost;
    }

    function addTaxDeduction(schedule) {

        // Accumulate fees to amortize them
        let totalFees = 0
        for (let i = 0; i < schedule.length; i++) {
            totalFees += schedule[i].fees;
        }
        const monthlyFees = totalFees / schedule.length
    
        // Calculate the tax deduction by combinint interest deduction and amortized fee deduction
        for (let i = 0; i < schedule.length; i++) {
            schedule[i].taxDeduction = -(schedule[i].interest + monthlyFees) * corporateTaxRate;
        }
    
        return schedule; // Return the modified schedule1
    }

    function createDebtTermSheet(values) {
        const { arr, current_runway, klymb_advisory_service, current_debt } = values;
        const { debtAmountMin, debtAmountMax } = calculateDebtRange(arr);
        const score = calculateScore(values);
        const booster = klymb_advisory_service * 0.1 + isNearProfitableCompany * 0.1 + isGrowthCompany * 0.1
        const scoreBoost = scoreBooster(score, booster)
        let debtAmount = roundToSignificantDigits(Math.max(0, calculateDebtParam(scoreBoost, debtAmountMin, debtAmountMax) - current_debt));

        let debtTermSheet = {
            isRunwayEnough: true,
            isTaxDeductible: isProfitableCompany,
            debtAmount: debtAmount,
            warrantCoverage: calculateDebtParam(scoreBoost, 0.07, 0.2, 0.005, reverseScale=true, isPercentage=true, isInteger=false),
            warrantDiscount: calculateDebtParam(scoreBoost, 0.1, 0.25, 0.05, reverseScale=true, isPercentage=true, isInteger=false),
            interestRate: calculateDebtParam(scoreBoost, 0.09, 0.16, 0.005, reverseScale=true, isPercentage=true, isInteger=false),
            interestOnlyPeriod: calculateDebtParam(scoreBoost, 6, 24, 3, reverseScale=false, isPercentage=false, isInteger=true),
            straightAmortization: calculateDebtParam(scoreBoost, 18, 36, 3, reverseScale=false, isPercentage=false, isInteger=true),
            arrangementFees: calculateDebtParam(scoreBoost, 0.01, 0.03, 0.005, reverseScale=true, isPercentage=true, isInteger=false),
            exitFees: calculateDebtParam(scoreBoost, 0, 0.03, 0.005, reverseScale=true, isPercentage=true, isInteger=false),
        };

        if (isGrowthCompany) {
            debtTermSheet.warrantCoverage = 0;
            debtTermSheet.warrantDiscount = 0;
            const additionalAmortization = 6 - ((score - 0.8) * (18 - 6)) / (1 - 0.8)
            debtTermSheet.straightAmortization += Math.round(additionalAmortization / 6) * 6
        }

        debtTermSheet.schedule = generatePaymentSchedule(debtTermSheet);
        debtTermSheet.newRunway = computeNewCashRunway(values, debtTermSheet);
        debtTermSheet.cashFlows = getCashFlowsArray(debtTermSheet.debtAmount, debtTermSheet.schedule)
        debtTermSheet.irr = XIRR(debtTermSheet.cashFlows)

        if (isProfitableCompany) {
            const loanDuration = (debtTermSheet.interestOnlyPeriod + debtTermSheet.straightAmortization) / 12
            debtTermSheet.afterTaxCostOfDebt = afterTaxCostOfDebt(debtTermSheet.interestRate, debtTermSheet.arrangementFees, debtTermSheet.exitFees, loanDuration)
            debtTermSheet.schedule = addTaxDeduction(debtTermSheet.schedule)
        }

        // Add event listener to "too large" runway, hence profitable or close to profitability businesses that are probably not suited for venture debt
        const isVentureCompany = isNearProfitableCompany === false;
        triggerHighRunwayAlert(debtTermSheet.newRunway - values.current_runway)
        triggerLowRunwayAlert() // Make sure to call triggerLowRunwayAlert AFTER triggerHighRunwayAlert which changes the state of isNearProfitableCompany

        // If the company is eligible to growth debt, but wasn't before 
        if (isVentureCompany && isNearProfitableCompany) {
            return createDebtTermSheet(values);
        }

        if (current_runway < minRunway && !isNearProfitableCompany) {
            debtTermSheet.isRunwayEnough = false;
        }

        return debtTermSheet;
    }

    function computeNewCashRunway(values, debtTermSheet) {
        const { current_runway: current_runway, cash_burn } = values;
        const { debtAmount } = debtTermSheet;
    
        // Calculate the current cash available
        const currentCash = current_runway * cash_burn;
        
        // Calculate the new cash available after adding the debt amount
        const newCash = currentCash + debtAmount;
        
        // Compute the new runway in months
        let newRunway = 0;
        if (cash_burn <= 0) {
            newRunway = Infinity;
        } else {
            newRunway = Math.round(newCash / cash_burn);
        }
    
        return newRunway;
    }

    function XIRR(values, dates = null, guess = 0.12) {
        // Helper function to generate monthly dates
        function generateMonthlyDates(length) {
            const dates = [];
            const currentDate = dayjs();
            for (let i = 0; i < length; i++) {
                const date = currentDate.add(i + 1, 'month').startOf('month');
                dates.push(date.toDate());
            }
            return dates;
        }
    
        // Handle case without dates by adding monthly payments
        if (dates === null) {
            const nbValues = values.length;
            dates = generateMonthlyDates(nbValues);
        }
    
        // Helper function to calculate the difference in days between two dates
        function dateDiffInDays(date1, date2) {
            const day1 = dayjs(date1);
            const day2 = dayjs(date2);
            return day2.diff(day1, 'day');
        }
    
        // Calculates the resulting amount
        var irrResult = function(values, dates, rate) {
            var r = rate + 1;
            var result = values[0];
            for (var i = 1; i < values.length; i++) {
                const diffInDays = dateDiffInDays(dates[0], dates[i]);
                result += values[i] / Math.pow(r, diffInDays / 365);
            }
            return result;
        }
    
        // Calculates the first derivation
        var irrResultDeriv = function(values, dates, rate) {
            var r = rate + 1;
            var result = 0;
            for (var i = 1; i < values.length; i++) {
                const diffInDays = dateDiffInDays(dates[0], dates[i]);
                const frac = diffInDays / 365;
                result -= frac * values[i] / Math.pow(r, frac + 1);
            }
            return result;
        }
    
        // Check that values contains at least one positive value and one negative value
        var positive = false;
        var negative = false;
        for (var i = 0; i < values.length; i++) {
            if (values[i] > 0) positive = true;
            if (values[i] < 0) negative = true;
        }
    
        // Return error if values does not contain at least one positive value and one negative value
        if (!positive || !negative) return '#NUM!';
    
        // Initialize guess and resultRate
        var guess = (typeof guess === 'undefined') ? 0.1 : guess;
        var resultRate = guess;
    
        // Set maximum epsilon for end of iteration
        var epsMax = 1e-10;
    
        // Set maximum number of iterations
        var iterMax = 50;
    
        // Implement Newton's method
        var newRate, epsRate, resultValue;
        var iteration = 0;
        var contLoop = true;
        do {
            resultValue = irrResult(values, dates, resultRate);
            newRate = resultRate - resultValue / irrResultDeriv(values, dates, resultRate);
            epsRate = Math.abs(newRate - resultRate);
            resultRate = newRate;
            contLoop = (epsRate > epsMax) && (Math.abs(resultValue) > epsMax);
        } while (contLoop && (++iteration < iterMax));
    
        if (contLoop) return '#NUM!';
    
        // Return internal rate of return
        return resultRate;
    }

    function getCashFlowsArray(amountBorrowed, schedule) {
        // Extract totalPayment values from the schedule
        const cashFlows = schedule.map(payment => payment.totalPayment);

        // Deduct the borrowed amount from the first repayment
        cashFlows[0] -= amountBorrowed;

        return cashFlows
    }

    function generatePaymentSchedule(debtTermSheet) {
        const {debtAmount, interestRate, interestOnlyPeriod, straightAmortization, arrangementFees, exitFees} = debtTermSheet
        const monthlyInterestRate = interestRate / 12;
        const totalMonths = interestOnlyPeriod + straightAmortization;
        const paymentSchedule = [];
    
        // Initial fees
        const initialFees = debtAmount * arrangementFees;
        const finalFees = debtAmount * exitFees;

        // Calculate fixed monthly payment for the amortization period
        const monthlyPayment = (debtAmount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -straightAmortization));
    
        // Initialize outstanding principal
        let outstandingPrincipal = debtAmount;
    
        for (let month = 1; month <= totalMonths; month++) {
            const payment = {
                month,
                interest: 0,
                fees: 0,
                totalCost: 0,
                principal: 0,
                totalPayment: 0,
                outstandingPrincipal: 0
            };
    
            if (month === 1) {
                // Initial fee payment
                payment.totalPayment += initialFees;
                payment.fees += initialFees;
            }
    
            if (month <= interestOnlyPeriod) {
                // Interest-only period
                payment.interest = outstandingPrincipal * monthlyInterestRate;
                payment.totalPayment = payment.interest
            } else {
                // Amortization period
                payment.interest = outstandingPrincipal * monthlyInterestRate;
                payment.principal = monthlyPayment - payment.interest;
                outstandingPrincipal -= payment.principal;
                payment.totalPayment = monthlyPayment;
            }
    
            payment.totalCost += payment.interest + payment.fees;
            payment.outstandingPrincipal = outstandingPrincipal;
            paymentSchedule.push(payment);
        }
    
        // Final fee payment
        paymentSchedule[totalMonths - 1].totalPayment += finalFees;
        paymentSchedule[totalMonths - 1].fees += finalFees;
        paymentSchedule[totalMonths - 1].totalCost += finalFees;
    
        return paymentSchedule;
    }

    function aggregateSchedule(schedule, isTaxDeductible=false) {
        const yearlyData = [];
        let currentYear = { interest: 0, fees: 0, principal: 0, taxDeduction: 0 };
    
        schedule.forEach((month, index) => {
            currentYear.interest += month.interest;
            currentYear.fees += month.fees;
            currentYear.principal += month.principal;
            if (isTaxDeductible) {
                currentYear.taxDeduction += month.taxDeduction;
            }
    
            if ((index + 1) % 12 === 0) {
                yearlyData.push(currentYear);
                currentYear = { interest: 0, fees: 0, principal: 0, taxDeduction: 0 };
            }
        });
    
        // Push the last year if it has data
        if (currentYear.interest !== 0 || currentYear.fees !== 0 || currentYear.principal !== 0) {
            yearlyData.push(currentYear);
        }
    
        return yearlyData;
    }

    function computeTotalPaidAndRemaining(schedule, targetVar, month) {
        let totalPaid = 0;
        let remainingBalance = 0;
    
        for (let i = 0; i < schedule.length; i++) {
            const payment = schedule[i];
    
            if (i < month) {
                totalPaid += payment[targetVar];
            } else {
                remainingBalance += payment[targetVar];
            }
        }
    
        return {
            totalPaid: totalPaid,
            remainingBalance: remainingBalance
        };
    }

    function yearlyToMonthlyGrowthRate(yearlyGrowthRate) {
    
        // Calculate the monthly growth rate
        return  Math.pow(1 + yearlyGrowthRate, 1 / 12) - 1;

    }

    function computeGrowingValuation(originalValuation, monthlyGrowthRate, months) {
    
        // Initialize the list of valuations
        const valuations = [];
    
        // Compute the valuation for each month
        let currentValuation = originalValuation;
        for (let month = 0; month < months; month++) {
            valuations.push(currentValuation);
            currentValuation *= (1 + monthlyGrowthRate);
        }
    
        return valuations;
    }

    function simulateNewOwnership(current_valuation, current_ownership, debtAmount) {
    
        // New valuation after equity investment
        const newValuation = current_valuation + debtAmount;
    
        // New ownership percentage
        const founderNewOwnership = (current_valuation * current_ownership) / newValuation;
    
        return founderNewOwnership;
    }

    function computeEquityValuation(debtTermSheet, valuationsDebt, transitionPeriod=6, includeFundraising=false) {
        const { debtAmount: equityInvestment } = debtTermSheet;    
        const valuationsEquity = [];
    
        for (let month = 0; month < valuationsDebt.length; month++) {
    
            let valuationEquity;
            if (includeFundraising && month < transitionPeriod) {
                const initialValuationWeight = (transitionPeriod - month) / transitionPeriod;
                valuationEquity = valuationsDebt[month] + initialValuationWeight * equityInvestment;
            } else {
                valuationEquity = valuationsDebt[month];
            }
    
            valuationsEquity.push(valuationEquity);
        }
    
        return valuationsEquity;
    }

    function computeValuationMetrics(values, debtTermSheet, transitionPeriod=6) {
        const { revenue_growth, current_valuation, current_ownership } = values;
        const { debtAmount, newRunway } = debtTermSheet;

        // Compute generic values
        const newOwnershipDebt = current_ownership;
        const newOwnershipEquity = simulateNewOwnership(current_valuation, current_ownership, debtAmount);

        if (newRunway >= runwayThreshold) {
            return {
                valuationsDebt: [],
                valuationsEquity: [],
                newOwnershipDebt,
                newOwnershipEquity,
                retainedValuesDebt: [],
                retainedValuesEquity: []
            };
        }
        
        // Compute cash burning businesses metrics
        const monthlyGrowthRate = yearlyToMonthlyGrowthRate(revenue_growth);
        const valuationsDebt = computeGrowingValuation(current_valuation, monthlyGrowthRate, newRunway);
        const valuationsEquity = computeEquityValuation(debtTermSheet, valuationsDebt, transitionPeriod);
        const retainedValuesDebt = valuationsDebt.map(valuation => valuation * newOwnershipDebt);
        const retainedValuesEquity = valuationsEquity.map(valuation => valuation * newOwnershipEquity);
    
        return {
            valuationsDebt,
            valuationsEquity,
            newOwnershipDebt,
            newOwnershipEquity,
            retainedValuesDebt,
            retainedValuesEquity
        };
    }

    function computeValuationIncrease(valuations, currentRunnway, newRunway) {
        return roundToSignificantDigits(valuations[newRunway - 1] - valuations[currentRunnway - 1], 4)
    }

    function formatToPercentage(value, nbDecimal=2) {
        // Multiply by 100 to convert the decimal to percentage
        // Use toFixed(2) to keep two decimal places
        return (value * 100).toFixed(nbDecimal) + '%';
    }

    function formatToCurrency(value, nbDecimal=0) {
        // Use toLocaleString to format the number with commas separating thousands
        return value.toLocaleString('en-US', { maximumFractionDigits: nbDecimal });
    }

    ////////////////////
    // Charts generation
    ////////////////////

    // Generic method to render or update a Plotly chart with animations
    function renderOrUpdatePlot(chartId, data, layout, onlyRender=false) {

        // Create config
        var config = {
            displayModeBar: false,  // Hide the modebarx
            responsive: true
          };

        // Adjust layout
        if (! ("margin" in layout)) {
            layout.margin = {r: 30, b:30};
        }

        Plotly.newPlot(chartId, data, layout, config)//.then(adjustClipPaths);
    }

    function isPortraitMode() {
        return window.innerHeight > window.innerWidth;
    }
    
    function isMobilePortrait() {
        // Define user agents for phones and tablets separately
        const phoneUserAgents = /android.*(mobile)|iphone|ipod|blackberry|iemobile|opera mini/i;
        const tabletUserAgents = /ipad|android(?!.*mobile)/i;
    
        // Get the user agent string
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    
        // Check if the device is a phone
        const isPhone = phoneUserAgents.test(userAgent.toLowerCase());
        // Check if the device is a tablet
        const isTablet = tabletUserAgents.test(userAgent.toLowerCase());
    
        // Check if the screen is in portrait mode
        const isPortrait = isPortraitMode();
    
        // Combine the checks
        return isPhone && isPortrait;
    }

    function chartCostComparison(totalPaid, remainingBalance, retainedValuesDebt, retainedValuesEquity, aggregateThreshold=0.2) {
        
        // Calculate the final difference between retainedValuesDebt and retainedValuesEquity
        const equityCost = retainedValuesDebt[retainedValuesDebt.length - 1] - retainedValuesEquity[retainedValuesEquity.length - 1];
        const fontSize = 12;

        // Create data series
        let debtPaidSerie = {
            x: ['Cost of debt'],
            y: [totalPaid],
            name: 'Total Paid',
            type: 'bar',
            marker: {
                color: '#8434B4',
            },
            hovertemplate: '<b>Total Paid:</b> %{y:.3s}<extra></extra>'
        }

        let debtRemainingSerie = {
            x: ['Cost of debt'],
            y: [remainingBalance],
            name: 'Remaining Balance',
            type: 'bar',
            marker: {
                color: '#ce93d8',
            },
            hovertemplate: '<b>Remaining Balance:</b> %{y:.3s}<extra></extra>'
        }

        let equityCostSerie = {
            x: ['Cost of Dilution'],
            y: [equityCost],
            name: 'Cost of Dilution',
            type: 'bar',
            marker: {
                color: '#bbbbbb',
            },
            hovertemplate: '%{y:.3s}<extra></extra>'
        }

        data = [debtPaidSerie, debtRemainingSerie, equityCostSerie]

        // Calculate dynamic axis ranges
        const yValues = [totalPaid + remainingBalance, equityCost]
        const ymin = 0;
        const ymax = Math.max(...yValues) * 1.1;

        // Layout for the bar chart
        const layout = {
            barmode: 'stack',
            title: 'Debt vs Equity financing cost',
            showlegend: false,  // Hide legend
            xaxis: {
                showgrid: false,  // Hide x-axis grid lines
                zeroline: false,  // Hide x-axis zero line
                showline: false,  // Hide x-axis line
                showticklabels: true,  // Show x-axis labels
                fixedrange: true  // Disable zoom for x-axis
            },
            yaxis: {
                range: [ymin, ymax],
                showgrid: false,  // Hide y-axis grid lines
                zeroline: false,  // Hide y-axis zero line
                showline: false,  // Hide y-axis line
                showticklabels: true,  // Show y-axis labels
                title: 'Amount (€)',
                fixedrange: true  // Disable zoom for x-axis
            },
            hovermode: 'closest',
            plot_bgcolor: 'rgba(0,0,0,0)',  // Transparent plot background
            paper_bgcolor: 'rgba(0,0,0,0)',  // Transparent paper background
            bargap: 0.2,
            bargroupgap: 0.1
        };

        // Plot the chart
        renderOrUpdatePlot('cost_comparison_chart', data, layout, onlyRender=true);
    }

    function chartRetainedValue(retainedValuesDebt, retainedValuesEquity, currentRunway) {
        const nbMonths = retainedValuesDebt.length;
        const valueDifference = retainedValuesDebt.map((item, index) => item - retainedValuesEquity[index]);
    
        // Split the data into two segments: solid line and dotted line
        const solidLineEndIndex = currentRunway - 1;
    
        // Data for the solid part of the line chart
        const solidLineData = {
            x: Array.from({ length: solidLineEndIndex + 1 }, (_, i) => i + 1),
            y: valueDifference.slice(0, solidLineEndIndex + 1),
            name: 'Debt (Solid Line)',
            type: 'scatter',
            mode: 'lines+text',
            fill: 'tozeroy',
            fillcolor: 'rgba( 207, 216, 220 , 0.5)',
            line: {
                color: '#607d8b',
                width: 3
            },
            hovertemplate: '<b>Initial runway</b>: %{y:.3s}<extra></extra>'
        };


        // Data for the constant line
        const constantLineData = {
            x: Array.from({ length: nbMonths - solidLineEndIndex }, (_, i) => solidLineEndIndex + i + 1),
            y: Array(nbMonths - solidLineEndIndex).fill(valueDifference[solidLineEndIndex]),
            name: 'Constant Line',
            type: 'scatter',
            mode: 'lines',
            fill: 'tozeroy',
            fillcolor: 'rgba( 207, 216, 220 , 0.5)',
            line: {
                color: 'rgba(255, 255, 255, 0)',  // Transparent constant line
                width: 0,
            },
            hoverinfo: 'none'
        };
    
        // Data for the dotted part of the line chart
        const dottedLineData = {
            x: Array.from({ length: nbMonths - solidLineEndIndex + 1}, (_, i) => solidLineEndIndex + i +1),
            y: valueDifference.slice(solidLineEndIndex),
            name: 'Debt',
            type: 'scatter',
            mode: 'lines+text',
            fill: 'tonexty',
            fillcolor: 'rgba(206, 147, 216, 0.5)',
            line: {
                color: '#8434B4',
                width: 3,
                dash: 'dot'
            },
            hovertemplate: '<b>Additional runway</b>: %{y:.3s}<extra></extra>'
        };
    
        // Data for the line chart
        const data = [solidLineData, constantLineData, dottedLineData];
    
        // Layout for the line chart
        const layout = {
            title: 'Retained Values Over Time',
            showlegend: false,  // Hide legend
            xaxis: {
                fixedrange: true,
                showgrid: false,  // Hide x-axis grid lines
                zeroline: false,  // Hide x-axis zero line
                showline: true,  // Show x-axis line
                showticklabels: true,  // Show x-axis labels
                range: [1, nbMonths],
                fixedrange: true  // Disable zoom for x-axis
            },
            yaxis: {
                showgrid: false,  // Hide y-axis grid lines
                zeroline: false,  // Hide y-axis zero line
                showline: true,  // Show y-axis line
                showticklabels: true,  // Show y-axis labels
                title: 'Retained Value',
                fixedrange: true  // Disable zoom for x-axis
            },
            hovermode: 'closest',
            plot_bgcolor: 'rgba(0,0,0,0)',  // Transparent plot background
            paper_bgcolor: 'rgba(0,0,0,0)'  // Transparent paper background
        };
    
        // Plot the chart
        renderOrUpdatePlot('retained_valuation_gap_chart', data, layout, onlyRender=true);
    }
    
    function chartYearlyPayments(schedule, isTaxDeductible=false) {
        const yearlyData = aggregateSchedule(schedule, isTaxDeductible);
        const years = yearlyData.map((_, index) => `Year ${index + 1}`);
        const interest = yearlyData.map(year => year.interest);
        const fees = yearlyData.map(year => year.fees);
        const principal = yearlyData.map(year => year.principal);
    
        const data = [
            {
                x: years,
                y: principal,
                name: 'Principal',
                type: 'bar',
                marker: { color: '#90a4ae' },
                hovertemplate: '<b>Principal:</b> %{y:.3s}<extra></extra>'
            },
            {
                x: years,
                y: interest,
                name: 'Interest',
                type: 'bar',
                marker: { color: '#8434B4' },
                hovertemplate: '<b>Interest:</b> %{y:.3s}<extra></extra>'
            },
            {
                x: years,
                y: fees,
                name: 'Fees',
                type: 'bar',
                marker: { color: '#f06292' },
                hovertemplate: '<b>Fees:</b> %{y:.3s}<extra></extra>'
            },
        ];

        if (isTaxDeductible) {
            const taxDeduction = yearlyData.map(year => year.taxDeduction);
            data.push({
                x: years,
                y: taxDeduction,
                name: 'Tax deductible',
                type: 'bar',
                marker: { color: '#314047' },
                hovertemplate: '<b>Tax deduction:</b> %{y:.3s}<extra></extra>'
            })
        }
    
        const layout = {
            // width: 400,
            // height: 240,
            title: 'Yearly loan amortization forecast',
            barmode: 'relative',
            xaxis: { fixedrange: true },
            yaxis: { title: 'Amount (€)', fixedrange: true },
            showlegend: false,
            hovermode: 'closest',
            plot_bgcolor: 'rgba(0,0,0,0)',  // Transparent plot background
            paper_bgcolor: 'rgba(0,0,0,0)',  // Transparent paper background
        };
    
        renderOrUpdatePlot('payment_schedule_chart', data, layout, onlyRender=true);
    }

    function chartDebtRatingRadar(debtTermSheet) {
        // Radar plot data
        const styler = (x) => `<br><span style='color:#8434B4; font-size:9; font-style: italic;'>${x}</span>`;
        
        const categories = [
            `Interest-only${styler(`${debtTermSheet.interestOnlyPeriod} months`)}`, 
            `Loan amortization${styler(`${debtTermSheet.straightAmortization} months`)}`, 
            `Interest rate${styler(`${(debtTermSheet.interestRate * 100).toFixed(2)}%`)}`, 
            `Arrangement fee${styler(`${(debtTermSheet.arrangementFees * 100).toFixed(2)}%`)}`, 
            `Exit fee${styler(`${(debtTermSheet.exitFees * 100).toFixed(2)}%`)}`, 
            `Warrant coverage${styler(`${(debtTermSheet.warrantCoverage * 100).toFixed(2)}%`)}`, 
            `Warrant discount${styler(`${(debtTermSheet.warrantDiscount * 100).toFixed(2)}%`)}`, 
            `Interest-only${styler(`${debtTermSheet.interestOnlyPeriod} months`)}`, 
        ];

        const values = [
            sigmoidAdjusted(debtTermSheet.interestOnlyPeriod, 0, 24, 10),
            sigmoidAdjusted(debtTermSheet.straightAmortization, 12, 48, 10),
            sigmoidAdjusted(debtTermSheet.interestRate, 0.16, 0.1, 10),
            sigmoidAdjusted(debtTermSheet.arrangementFees, 0.03, 0, 10),
            sigmoidAdjusted(debtTermSheet.exitFees, 0.04, 0, 10),
            sigmoidAdjusted(debtTermSheet.warrantCoverage, 0.3, 0, 6),
            sigmoidAdjusted(debtTermSheet.warrantDiscount, 0.3, 0, 6),
            sigmoidAdjusted(debtTermSheet.interestOnlyPeriod, 0, 24, 10),
        ];

        const data = [{
            type: 'scatterpolar',
            r: values,
            theta: categories,
            fill: 'toself',
            marker: {
                line: {
                    color: "#8434B4",
                    width: 0
                }
            },
            line: {
                color: "#8434B4"
            },
            hoverinfo: 'none'
        }];

        const layout = {
            // width: 400,
            // height: 240,
            // autosize: true,
            margin: { t: 40, r: 40, b: 40, l: 40 },
            polar: {
                radialaxis: {
                    showgrid: true,
                    showticklabels: false,
                    ticks: '',
                    showline: false,  // Remove radial axis line
                    range: [0, 1],
                    fixedrange: true
                },
                angularaxis: {
                    rotation: 80,
                    direction: "clockwise",
                    showgrid: true,
                    showline: true,
                    tickfont: {
                        size: 12,
                        color: 'Black'  // Custom font size and color for angular axis
                    },
                    fixedrange: true
                }
            },
            dragmode:false,
            modeBarButtonsToRemove: ['zoom2d', 'pan2d', 'select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', 'resetScale2d'],
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            annotations: [
                {
                    text: `<b>IRR: ${(debtTermSheet.irr * 100).toFixed(2)}%</b>`,
                    xref: "paper", 
                    yref: "paper",
                    font: { size: 12 },
                    x: 0.5,
                    y: 0.5,
                    showarrow: false
                }
            ]
        };

        // Update layout for mobile
        // const mediaQuery = window.matchMedia('(max-width: 767px)');
        if (isMobilePortrait()) { 
            layout.margin = { t: 30, b: 30, r: 30, l: 30 },
            layout.polar.angularaxis.tickfont.size = 10;  // Smaller font size for mobile
            layout.annotations[0].font.size = 10;  // Smaller annotation font size for mobile
        }

        renderOrUpdatePlot('debt_radar_chart', data, layout);
    }

    function showElement(elementId, focusParent = false) {
        const element = document.getElementById(elementId);
        
        if (!element) {
            console.error(`Element with ID ${elementId} not found`);
            return;
        }
    
        if (focusParent && element.parentElement) {
            element.parentElement.classList.add('show');
        } else {
            element.classList.add('show');
        }
    }
    
    function hideElement(elementId, focusParent = false) {
        const element = document.getElementById(elementId);
        
        if (!element) {
            console.error(`Element with ID ${elementId} not found`);
            return;
        }
    
        if (focusParent && element.parentElement) {
            element.parentElement.classList.remove('show');
        } else {
            element.classList.remove('show');
        }
    }

    function updateCharts(values, debtTermSheet) {
        const { debtAmount, schedule, newRunway, isTaxDeductible } = debtTermSheet;
        const { current_runway } = values;
        const { totalPaid, remainingBalance } = computeTotalPaidAndRemaining(schedule, 'totalCost', newRunway);
    
        const {
            valuationsDebt,
            valuationsEquity,
            newOwnershipDebt,
            newOwnershipEquity,
            retainedValuesDebt,
            retainedValuesEquity
        } = computeValuationMetrics(values, debtTermSheet, 6);
    
        // Update elements applicable to all scenarios
        // Update cards value
        document.getElementById('amountRaised').textContent = formatToCurrency(debtAmount);
        document.getElementById('retainedOwnership').textContent = formatToPercentage(newOwnershipDebt - newOwnershipEquity);
    
        // Update charts
        chartDebtRatingRadar(debtTermSheet);
        chartYearlyPayments(schedule, isTaxDeductible);

        // Update elements applicable to non-profitable businesses
        if (!isNearProfitableCompany) {
            // Update cards value
            document.getElementById('additionalRunway').textContent = Math.round(newRunway - current_runway) + " months";
            document.getElementById('increasedValuation').textContent = formatToCurrency(computeValuationIncrease(valuationsDebt, current_runway, newRunway));

            // Update charts
            chartCostComparison(totalPaid, remainingBalance, retainedValuesDebt, retainedValuesEquity);
            chartRetainedValue(retainedValuesDebt, retainedValuesEquity, current_runway);
        }

        if (isProfitableCompany) {
            document.getElementById('afterTaxCostOfDebt').textContent = formatToPercentage(debtTermSheet.afterTaxCostOfDebt);
        }
    }

    function updateResults() {
        // Update form values
        let values
        try {
            values = captureValues();
        } catch(error) {
            hideElement('result-container');
            return
        }

        // Overwrite Klymb advisory since we decided to remove the field
        values.klymb_advisory_service = true

        // Check high growth business
        isProfitableCompany = values.cash_burn < 0;
        isGrowthCompany = (-12 * values.cash_burn) > growthThreshold;
        isNearProfitableCompany = isProfitableCompany

        // Compute debt informations
        const debtTermSheet = createDebtTermSheet(values);

        // Show analysis if and only if all values are filled
        if (hasNullValues(values) || debtTermSheet.debtAmount === 0) {
            hideElement('result-container');
            return;
        }

        // Add event listener to debt input alert
        triggerDebtAlert(values.current_debt, debtTermSheet.debtAmount);

        // Generate / update charts and display
        showElement('result-container');
        updateCharts(values, debtTermSheet);
        
    }

    //////////////////
    // Event Listeners
    //////////////////

    // Add event listeners to currency inputs for formatting
    const currencyInputs = document.querySelectorAll('.number-input');
    currencyInputs.forEach(input => {
        input.addEventListener('input', handleCurrencyInputChange);
        input.addEventListener('blur', formatCurrencyInputOnBlur);
        input.addEventListener('focus', removeCommasOnFocus);
    });
    // Add event listeners to percentage inputs for validation
    const percentageInputs = document.querySelectorAll('.percentage-input');
    percentageInputs.forEach(input => {
        input.addEventListener('input', validatePercentageInput);
        input.addEventListener('blur', validatePercentageInput);
        input.addEventListener('click', handleCursorMove);
        input.addEventListener('keydown', handleCursorMove);
        input.addEventListener('focus', handleCursorMove);
    });

    // Add event listeners to runway input alert
    const runwayInput = document.getElementById('current_runway');
    runwayInput.addEventListener('blur', triggerLowRunwayAlert);

    // Add event listener to changes in the form
    inputs.forEach(input => {
        input.addEventListener('blur', updateResults);
        input.addEventListener('keydown', updateResults);
    });
    // const klymbAdvisory = document.getElementById('klymb_advisory_service');
    // klymbAdvisory.addEventListener('change', updateResults);

    // Initial capture on page load
    updateResults();
});
