const form = document.querySelector('form');
const inputs = form.querySelectorAll('input, select');
let isEditing = false;
const minRunway = 12;
const runwayThreshold = 60;
let isNearProfitableCompany = false;
let isProfitableCompany = false;
let isGrowthCompany = false;
const growthThreshold = 2000000 // 2m yearly negative cash burn
const corporateTaxRate = 0.25 // 25% assumed for European countries
const arrThreshold = 1000000;

const investorsList = [
    { investorId: 1, minAmount: 5000000, maxAmount: 100000000 },
    { investorId: 2, minAmount: 15000000, maxAmount: 250000000 },
    { investorId: 3, minAmount: 10000000, maxAmount: 60000000 },
    { investorId: 4, minAmount: 2000000, maxAmount: 50000000 },
    { investorId: 5, minAmount: 7000000, maxAmount: 50000000 },
    { investorId: 6, minAmount: 1000000, maxAmount: 10000000 },
    { investorId: 7, minAmount: 2000000, maxAmount: 15000000 },
    { investorId: 8, minAmount: 2000000, maxAmount: 10000000 },
    { investorId: 9, minAmount: 5000000, maxAmount: 25000000 },
    { investorId: 10, minAmount: 10000000, maxAmount: 200000000 },
    { investorId: 11, minAmount: 5000000, maxAmount: 15000000 },
    { investorId: 12, minAmount: 5000000, maxAmount: 20000000 },
    { investorId: 13, minAmount: 5000000, maxAmount: 250000000 },
    { investorId: 14, minAmount: 500000000, maxAmount: 5000000 },
    { investorId: 15, minAmount: 1000000, maxAmount: 10000000 },
    { investorId: 16, minAmount: 2000000, maxAmount: 6000000 },
    { investorId: 17, minAmount: 2000000, maxAmount: 20000000 },
    { investorId: 18, minAmount: 2000000, maxAmount: 15000000 },
    { investorId: 19, minAmount: 5000000, maxAmount: 100000000 },
    { investorId: 20, minAmount: 5000000, maxAmount: 75000000 },
    { investorId: 21, minAmount: 1000000, maxAmount: 15000000 },
    { investorId: 22, minAmount: 3000000, maxAmount: 50000000 },
    { investorId: 23, minAmount: 1000000, maxAmount: 10000000 },
    { investorId: 24, minAmount: 100000000, maxAmount: 10000000 },
    { investorId: 25, minAmount: 1000000, maxAmount: 10000000 },
    { investorId: 26, minAmount: 1000000, maxAmount: 5000000 },
    { investorId: 27, minAmount: 1000000, maxAmount: 5000000 },
    { investorId: 28, minAmount: 20000000, maxAmount: 100000000 },
    { investorId: 29, minAmount: 5000000, maxAmount: 15000000 },
    { investorId: 30, minAmount: 50000000, maxAmount: 150000000 },
    { investorId: 31, minAmount: 20000000, maxAmount: 100000000 },
    { investorId: 32, minAmount: 2000000, maxAmount: 10000000 },
    { investorId: 33, minAmount: 10000000, maxAmount: 10000000 },
    { investorId: 34, minAmount: 1000000, maxAmount: 5000000 },
    { investorId: 35, minAmount: 3000000, maxAmount: 20000000 },
    { investorId: 36, minAmount: 5000000, maxAmount: 50000000 },
    { investorId: 37, minAmount: 500000000, maxAmount: 2000000 },
    { investorId: 38, minAmount: 200000000, maxAmount: 2000000 },
    { investorId: 39, minAmount: 500000000, maxAmount: 3000000 },
    { investorId: 40, minAmount: 2000000, maxAmount: 25000000 },
    { investorId: 41, minAmount: 100000000, maxAmount: 3000000 },
    { investorId: 42, minAmount: 50000000, maxAmount: 200000000 },
    { investorId: 43, minAmount: 10000000, maxAmount: 50000000 },
    { investorId: 44, minAmount: 5000000, maxAmount: 75000000 },
    { investorId: 45, minAmount: 10000000, maxAmount: 50000000 },
    { investorId: 46, minAmount: 500000000, maxAmount: 4000000 }
];


// Function to format the input value as currency
function formatCurrencyInputOnBlur(event) {
    const input = event.target;
    const value = parseFloat(input.value.replace(/,/g, ''));
    if (!isNaN(value) && input.value !== '') {
        input.value = value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
}

function handleCurrencyInputChange(event) {
    const input = event.target;
    const cursorPosition = input.selectionStart;
    
    // Get the value without commas
    const rawValue = input.value.replace(/,/g, '');
    
    // Insert the comma at the cursor position if needed
    // const valueWithCommas = parseFloat(rawValue).toLocaleString('en-US', { maximumFractionDigits: 0 });
    
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
    // List of required field names
    const requiredFields = [
        'revenue_growth',
        'gross_margin',
        'cash_burn',
        'current_runway',
        'current_valuation',
        'current_ownership',
        'arr'
        // Add other required field names here
    ];

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

    // Check required fields for empty values
    for (const input of inputs) {
        if (requiredFields.includes(input.name)) {
            if (input.value === '' || input.value === null || input.value === undefined) {
                hasError = true; // Raise error for empty required field
                break; // Exit the loop once an empty required field is found
            }
        }
    }

    if (hasError) {
        throw new Error('Input missing.')
    }

    return values;
}

//////////////////
// Validate inputs
//////////////////

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
        runwayInput.classList.add('input-error');
    } else {
        hideElement('runway-container');
        runwayInput.classList.remove('input-error');
    }
}

function triggerHighRunwayAlert(newRunway, forceTrigger=false) {
    let isHighRunway = false
    if ((newRunway !== null && newRunway > runwayThreshold) || forceTrigger) {
        isNearProfitableCompany = true;
        hideElement('additionalRunway', focusParent=true);
        hideElement('increasedValuation', focusParent=true);
        hideElement('cost_comparison_chart');
        // hideElement('retained_valuation_gap_chart');
        hideElement('cashflow_evolution_chart');
        hideElement('afterTaxCostOfDebt', focusParent=true);
        isHighRunway = true
    } else {
        console.log('here')
        isNearProfitableCompany = false;
        showElement('additionalRunway', focusParent=true);
        showElement('increasedValuation', focusParent=true);
        showElement('cost_comparison_chart');
        // showElement('retained_valuation_gap_chart');
        showElement('cashflow_evolution_chart');
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

    if ((isNearProfitableCompany || isProfitableCompany) && !isGrowthCompany) {
        showElement('near-profitability-container');
    } else {
        hideElement('near-profitability-container');
    }

    return isHighRunway
}

function triggerLowARRAlert(arr, cash_burn) {
    const arrInput = document.getElementById('arr');
    if (arr < arrThreshold || arr < cash_burn*6) {
        showElement('arr-container');
        hideElement('growth-container');
        hideElement('near-profitability-container');
        arrInput.classList.add('input-error');
        return true;
    }
    hideElement('arr-container');
    arrInput.classList.remove('input-error');
    return false;
}

function calculateDebtRange(arr) {
    const debtAmountMin = 0.5 * arr;
    const debtAmountMax = 1.5 * arr;
    return { debtAmountMin, debtAmountMax };
}

function calculateBurnMultiple(arr, cash_burn, revenue_growth) {
    const arrIncrease = arr * revenue_growth / 12
    if (arrIncrease === 0) {
        return Infinity;
    }
    const burnMultiple = cash_burn / arrIncrease
    return burnMultiple
}

function scoreBooster(score, booster=0) {
    return Math.min(1, score * (1 + booster))
}

function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

function sigmoidAdjusted(value, minVal, maxVal, midVal = null, curveCoef = 10) {
    // Return 1 if no range (minVal === maxVal)
    if (minVal === maxVal) {
        return 1;
    }

    // If midVal is not provided, set it as the midpoint between minVal and maxVal
    if (midVal == null) {
        midVal = (minVal + maxVal) / 2;
    }

    // If reversed scale with minVal > maxVal, get the inverse of all values
    if (minVal > maxVal) {
        value = -value;
        minVal = -minVal;
        maxVal = -maxVal;
        midVal = -midVal;
    }

    // Normalize the input value to a range suitable for the sigmoid function
    const normalizedValue = curveCoef * (value - midVal) / (maxVal - minVal);

    // Adjust output for boundaries: 
    // values less than minVal should return between 0 and 0.1, 
    // and values greater than maxVal should return between 0.9 and 1.
    if (value < minVal) {
        return 0.1 * sigmoid(normalizedValue);
    } else if (value > maxVal) {
        return 0.9 + 0.1 * sigmoid(normalizedValue);
    } else {
        return sigmoid(normalizedValue);
    }
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
    score += sigmoidAdjusted(revenue_growth, 0, 1, 0.6) * 30;
    score += sigmoidAdjusted(gross_margin, .2, .8, .6) * 20;
    score += sigmoidAdjusted(current_valuation / arr, 2, 10, 5) * 10;
    if (isNearProfitableCompany) {
        score += 10;
    } else {
        score += sigmoidAdjusted(current_runway, 6, 18, 12) * 10;
    }

    // Get the minimum score between the ruleof40 and the burnMultiple to accomodate profitable businesses as well
    let cashBurnScore = 0;
    if (cash_burn <= 0) {
        cashBurnScore = 1;
    } else {
        cashBurnScore = calculateBurnScore(arr, calculateBurnMultiple(arr, cash_burn, revenue_growth));
    }
    score += cashBurnScore * 20
    // const ruleOf40 = calculateRuleOf40(arr, revenue_growth, cash_burn);
    // const ruleOf40Score = ruleOf40ProxyScore(ruleOf40);
    // console.log('Ruleof40 : ', ruleOf40, ruleOf40Score);
    // score += Math.min(cashBurnScore, ruleOf40Score) * 20;



    // Normalize score to 0-1 range
    score = Math.max(0, Math.min(1, score / 90));
    return score;
}

function calculateBurnScore(arr, burn_multiple) {
    // Based on a16z evaluation https://a16z.com/a-framework-for-navigating-down-markets/
    let lower, upper;

    switch (true) {
        case arr >= 0 && arr <= 10000000: // $0 - $10M
            lower = 3.8;
            mid = 1.6;
            upper = 1.1;
            break;

        case arr > 10000000 && arr <= 25000000: // $10M - $25M
            lower = 1.8;
            mid = 1.4;
            upper = 0.8;
            break;

        case arr > 25000000 && arr <= 75000000: // $25M - $75M
            lower = 1.1;
            mid = 0.7;
            upper = 0.5;
            break;

        case arr > 75000000: // $75M+
            lower = 0.9;
            mid = 0.5;
            upper = 0;
            break;

        default:
            throw new Error("Invalid ARR range");
    }

    return sigmoidAdjusted(burn_multiple, lower, upper, mid);
}

function calculateRuleOf40(arr, yearlyGrowthRate, monthlyCashBurn) {

    // Step 1: Calculate the Cash Flow Margin
    const cashFlowMargin = - monthlyCashBurn / (arr / 12);

    // Step 3: Calculate the Rule of 40 proxy (sum of annual growth rate and cash flow margin)
    const ruleOf40 = yearlyGrowthRate + cashFlowMargin;

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

function calculateDebtParam(score, min, max, mid = null, step = null, reverseScale = false, isPercentage = false, isInteger = false) {
    let result;

    // If mid is not provided, set it to the midpoint between min and max
    if (mid === null) {
        mid = (min + max) / 2;
    }

    // Adjust result based on score and mid
    if (reverseScale) {
        // In case of reverse scale, flip the score
        score = 1 - score;
    }
    
    if (score < 0.5) {
        // Interpolate between min and mid for the first half of the score
        result = min + (score * 2) * (mid - min);
    } else {
        // Interpolate between mid and max for the second half of the score
        result = mid + ((score - 0.5) * 2) * (max - mid);
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

function createDebtTermSheet(values, boosterCoef=null) {
    const { arr, current_runway, klymb_advisory_service, amount_to_raise  } = values;
    const { debtAmountMin, debtAmountMax } = calculateDebtRange(arr);
    const score = calculateScore(values);
    let booster = 0
    if (boosterCoef === null) {
        booster = klymb_advisory_service * 0 + isNearProfitableCompany * 0.05 + isGrowthCompany * 0.1
    } else {
        booster = boosterCoef
    }
    const scoreBoost = scoreBooster(score, booster)
    let debtAmountComputed = roundToSignificantDigits(Math.max(0, calculateDebtParam(scoreBoost, debtAmountMin, debtAmountMax)));

    // Adjust debtAmount based on amount_to_raise
    let debtAmount = debtAmountComputed;
    let amountToRaiseExceeded = false;

    if (amount_to_raise) {
        if (amount_to_raise <= debtAmountComputed) {
            debtAmount = amount_to_raise;
        } else {
            // Display a warning that the amount_to_raise exceeds the maximum computed debt amount
            debtAmount = debtAmountComputed;
            amountToRaiseExceeded = true;
        }
    }

    let debtTermSheet = {
        isRunwayEnough: true,
        amountToRaiseExceeded: amountToRaiseExceeded,
        isTaxDeductible: isProfitableCompany,
        debtAmount: debtAmount,
        warrantCoverage: calculateDebtParam(scoreBoost, 0.05, 0.25, 0.1, 0.005, reverseScale=true, isPercentage=true, isInteger=false),
        warrantDiscount: calculateDebtParam(scoreBoost, 0.05, 0.20, 0.1, 0.05, reverseScale=true, isPercentage=true, isInteger=false),
        interestRate: calculateDebtParam(scoreBoost, 0.09, 0.16, 0.14, 0.005, reverseScale=true, isPercentage=true, isInteger=false),
        interestOnlyPeriod: calculateDebtParam(scoreBoost, 6, 24, 12, 6, reverseScale=false, isPercentage=false, isInteger=true),
        straightAmortization: calculateDebtParam(scoreBoost, 12, 48, 36, 6, reverseScale=false, isPercentage=false, isInteger=true),
        arrangementFees: calculateDebtParam(scoreBoost, 0.01, 0.025, 0.02, 0.005, reverseScale=true, isPercentage=true, isInteger=false),
        exitFees: calculateDebtParam(scoreBoost, 0, 0.03, 0.02, 0.005, reverseScale=true, isPercentage=true, isInteger=false),
    };

    if (isGrowthCompany) {
        debtTermSheet.warrantCoverage = 0;
        debtTermSheet.warrantDiscount = 0;

        // Add a minimum of 6 and up to 18 months if the score is >= 0.8
        const additionalAmortization = 6 + Math.max(0, ((score - 0.8) * (18 - 6)) / (1 - 0.8)); 
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
    const newRunway = cash_burn > 0 ? Math.round(newCash / cash_burn) : Infinity;

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

function computeNumberOfInvestors(targetAmount, cashBurn) {
    let numberOfInvestors = 0;

    // Ensure targetAmount is a number
    targetAmount = parseFloat(targetAmount);
    if (isNaN(targetAmount) || targetAmount <= 0) {
        throw new Error('Invalid amount to raise. It must be a positive number.');
    }

    // Ensure cashBurn is a number
    cashBurn = parseFloat(cashBurn);
    if (isNaN(cashBurn)) {
        throw new Error('Invalid cash burn.');
    }

    // Increment numberOfInvestors with growth lenders depending on profitability
    const profitability = -12 * cashBurn;
    // Use switch statement for cumulative increments
    switch (true) {
        case (profitability > 1000000):
            numberOfInvestors += 5;
        // No break; execution falls through to the next case
        case (profitability > 3000000):
            numberOfInvestors += 10;
        // No break; execution falls through
        case (profitability > 5000000):
            numberOfInvestors += 16;
            break; // Optional, since it's the last case
        default:
            // Do nothing if none of the conditions are met
    }

    // Filter investors whose minAmount <= targetAmount <= maxAmount
    const matchingInvestors = investorsList.filter(investor => 
        targetAmount >= investor.minAmount && targetAmount <= investor.maxAmount
    );

    // The number of matching investors
    numberOfInvestors += matchingInvestors.length;

    return numberOfInvestors
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

    // Adjust layout margin for large and small screens
    if (! ("margin" in layout)) {
        const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        if (screenWidth <= 800) {
            layout.margin = {r: 30, b:30, t: 70};
        } else {
            layout.margin = {r: 30, b:30, t: 60};
        }        
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

function chartDebtRatingRadar(debtTermSheetHigh, debtTermSheetLow) {
    // Helper function to format parameter ranges
    function formatParameterRange(lowValue, highValue, unit = '', isPercentage = false, decimals = 2) {
        // Format values with specified decimals
        const formattedLow = isPercentage ? (lowValue * 100).toFixed(decimals) : lowValue.toFixed(decimals);
        const formattedHigh = isPercentage ? (highValue * 100).toFixed(decimals) : highValue.toFixed(decimals);

        // Remove trailing zeros and decimal points if not needed
        const trimmedLow = formattedLow.replace(/\.00$/, '');
        const trimmedHigh = formattedHigh.replace(/\.00$/, '');

        if (trimmedLow === trimmedHigh) {
            return `${trimmedLow}${unit}`;
        } else {
            return `${trimmedLow} - ${trimmedHigh}${unit}`;
        }
    }

    // Styler function for labels
    const styler = (x) => `<br><span style='color:#8434B4; font-size:9; font-style: italic;'>${x}</span>`;

    // Define categories with formatted parameter ranges
    const categories = [
        `Interest-only${styler(formatParameterRange(
            debtTermSheetLow.interestOnlyPeriod,
            debtTermSheetHigh.interestOnlyPeriod,
            ' months'
        ))}`,
        `Loan amortization${styler(formatParameterRange(
            debtTermSheetLow.straightAmortization,
            debtTermSheetHigh.straightAmortization,
            ' months'
        ))}`,
        `Interest rate${styler(formatParameterRange(
            debtTermSheetLow.interestRate,
            debtTermSheetHigh.interestRate,
            '%',
            true
        ))}`,
        `Arrangement fee${styler(formatParameterRange(
            debtTermSheetLow.arrangementFees,
            debtTermSheetHigh.arrangementFees,
            '%',
            true
        ))}`,
        `Exit fee${styler(formatParameterRange(
            debtTermSheetLow.exitFees,
            debtTermSheetHigh.exitFees,
            '%',
            true
        ))}`,
        `Warrant coverage${styler(formatParameterRange(
            debtTermSheetLow.warrantCoverage,
            debtTermSheetHigh.warrantCoverage,
            '%',
            true
        ))}`,
        `Warrant discount${styler(formatParameterRange(
            debtTermSheetLow.warrantDiscount,
            debtTermSheetHigh.warrantDiscount,
            '%',
            true
        ))}`,
        `Interest-only${styler(formatParameterRange(
            debtTermSheetLow.interestOnlyPeriod,
            debtTermSheetHigh.interestOnlyPeriod,
            ' months'
        ))}`, // Close the loop for radar chart
    ];

    const valuesHigh = [
        sigmoidAdjusted(debtTermSheetHigh.interestOnlyPeriod, 0, 24, 12, 10),
        sigmoidAdjusted(debtTermSheetHigh.straightAmortization, 12, 48, 30, 10),
        sigmoidAdjusted(debtTermSheetHigh.interestRate, 0.17, 0.09, 0.14, 10),
        sigmoidAdjusted(debtTermSheetHigh.arrangementFees, 0.04, 0, 0.02, 10),
        sigmoidAdjusted(debtTermSheetHigh.exitFees, 0.04, 0, 0.02, 10),
        sigmoidAdjusted(debtTermSheetHigh.warrantCoverage, 0.3, 0, 0.1, 6),
        sigmoidAdjusted(debtTermSheetHigh.warrantDiscount, 0.3, 0, 0.1, 6),
        sigmoidAdjusted(debtTermSheetHigh.interestOnlyPeriod, 0, 24, 12, 10),
    ];

    const valuesLow = [
        sigmoidAdjusted(debtTermSheetLow.interestOnlyPeriod, 0, 24, 12, 10),
        sigmoidAdjusted(debtTermSheetLow.straightAmortization, 12, 48, 30, 10),
        sigmoidAdjusted(debtTermSheetLow.interestRate, 0.17, 0.09, 0.14, 10),
        sigmoidAdjusted(debtTermSheetLow.arrangementFees, 0.04, 0, 0.02, 10),
        sigmoidAdjusted(debtTermSheetLow.exitFees, 0.04, 0, 0.02, 10),
        sigmoidAdjusted(debtTermSheetLow.warrantCoverage, 0.3, 0, 0.1, 6),
        sigmoidAdjusted(debtTermSheetLow.warrantDiscount, 0.3, 0, 0.1, 6),
        sigmoidAdjusted(debtTermSheetLow.interestOnlyPeriod, 0, 24, 12, 10),
    ];

    // Create trace for high values
    const traceHigh = {
        type: 'scatterpolar',
        r: valuesHigh,
        theta: categories,
        fill: 'tonext',
        name: 'Best Terms',
        marker: {
            color: '#8434B4',
        },
        line: {
            color: '#8434B4'
        },
        hoverinfo: 'none'
    };

    // Create trace for low values
    const traceLow = {
        type: 'scatterpolar',
        r: valuesLow,
        theta: categories,
        fill: 'toself',
        name: 'Worst Terms',
        marker: {
            color: '#b55bc4',
        },
        line: {
            color: '#b55bc4'
        },
        hoverinfo: 'none'
    };

    const data = [traceLow, traceHigh];

    const layout = {
        margin: { t: 40, r: 40, b: 40, l: 40 },
        polar: {
            radialaxis: {
                showgrid: true,
                showticklabels: false,
                ticks: '',
                showline: false,
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
                    color: 'Black'
                },
                fixedrange: true
            }
        },
        dragmode: false,
        showlegend: true,
        legend: {
            x: 0.5,
            y: -0.2,
            orientation: 'h',
            xanchor: 'center',
            font: {
                size: 10
            }
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
    };

    // Adjust layout for small screens
    const screenWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
    if (screenWidth <= 800) {
        layout.margin = { t: 40, r: 60, b: 40, l: 60 };
        layout.polar.angularaxis.tickfont.size = 10; // Reduce font size
    }

    renderOrUpdatePlot('debt_radar_chart', data, layout);
}

function chartCashFlowsEvolution(values, debtTermSheet) {
    const { current_runway, cash_burn } = values;
    const { debtAmount, schedule } = debtTermSheet;

    // Ensure cash_burn is positive when burning cash
    const cashBurnMonthly = cash_burn; // Positive value for cash outflow
    const initialCash = current_runway * cashBurnMonthly;

    // Compute cash balances without debt
    const cashBalanceWithoutDebt = [];
    let cashBalanceNoDebt = initialCash;
    let monthNoDebt = 0;

    while (cashBalanceNoDebt >= 0) {
        cashBalanceWithoutDebt.push({
            month: monthNoDebt,
            cashBalance: cashBalanceNoDebt,
        });
        cashBalanceNoDebt -= cashBurnMonthly; // Subtract cash burn
        monthNoDebt += 1;
    }
    // Add the final negative cash balance to cross zero
    // Calculate fractional month where cash balance reaches zero
    const lastPositiveCashBalance = cashBalanceNoDebt + cashBurnMonthly;
    const deltaCash = lastPositiveCashBalance;
    const deltaMonth = deltaCash / cashBurnMonthly;
    const exactZeroMonth = monthNoDebt - 1 + deltaMonth;
    cashBalanceWithoutDebt.push({
        month: exactZeroMonth,
        cashBalance: 0,
    });

    // Compute cash balances with debt
    const debtPayments = schedule.map(payment => payment.totalPayment);
    const cashBalanceWithDebt = [];
    let cashBalanceDebt = initialCash + debtAmount; // Add debt amount to initial cash
    let monthWithDebt = 0;

    while (cashBalanceDebt > 0) {
        const payment = debtPayments[monthWithDebt] || 0;
        cashBalanceWithDebt.push({
            month: monthWithDebt,
            cashBalance: cashBalanceDebt,
        });
        cashBalanceDebt -= (cashBurnMonthly + payment); // Subtract cash burn and loan payment
        monthWithDebt += 1;
    }
    // Add the final negative cash balance to cross zero
    const lastPositiveCashBalanceDebt = cashBalanceDebt + cashBurnMonthly + (debtPayments[monthWithDebt - 1] || 0);
    const totalOutflow = cashBurnMonthly + (debtPayments[monthWithDebt - 1] || 0);
    const deltaMonthDebt = lastPositiveCashBalanceDebt / totalOutflow;
    const exactZeroMonthDebt = monthWithDebt - 1 + deltaMonthDebt;
    cashBalanceWithDebt.push({
        month: exactZeroMonthDebt,
        cashBalance: 0,
    });

    // Prepare data for Plotly
    const monthsNoDebt = cashBalanceWithoutDebt.map(point => point.month);
    const cashBalancesNoDebt = cashBalanceWithoutDebt.map(point => point.cashBalance);

    const monthsWithDebt = cashBalanceWithDebt.map(point => point.month);
    const cashBalancesWithDebt = cashBalanceWithDebt.map(point => point.cashBalance);

    // Create custom data arrays with rounded-up months
    const hoverMonthsNoDebt = monthsNoDebt.map(month => Math.ceil(month));
    const hoverMonthsWithDebt = monthsWithDebt.map(month => Math.ceil(month));

    const traceNoDebt = {
        x: monthsNoDebt,
        y: cashBalancesNoDebt,
        mode: 'lines',
        name: 'Without Debt',
        line: { color: '#b55bc4', width: 3 },
        customdata: hoverMonthsNoDebt,
        hovertemplate: 'Month %{customdata}<br>Cash balance: %{y:,.3s}<extra></extra>',
    };

    const traceWithDebt = {
        x: monthsWithDebt,
        y: cashBalancesWithDebt,
        mode: 'lines',
        name: 'With Debt',
        line: { color: '#8434B4', width: 3 },
        customdata: hoverMonthsWithDebt,
        hovertemplate: 'Month %{customdata}<br>Cash balance: %{y:,.3s}<extra></extra>',
    };

    const data = [traceNoDebt, traceWithDebt];

    // Adjust the x-axis range
    const xMax = Math.max(
        monthsNoDebt[monthsNoDebt.length - 1],
        monthsWithDebt[monthsWithDebt.length - 1]
    );

    const layout = {
        title: 'Cash Balance Forecast',
        xaxis: { 
            range: [0, xMax + 1], 
            fixedrange: true,
            showgrid: false,
            showline: true,
        },
        yaxis: { 
            title: 'Cash Balance (€)', 
            range: [0, null], 
            fixedrange: true,
            showgrid: false,
            showline: false,
        },
        legend: {
            x: 0.5,
            y: -0.1,
            orientation: 'h',
            xanchor: 'center',
            font: {
                size: 10
            }
        },
        hovermode: 'closest',
        plot_bgcolor: 'rgba(0,0,0,0)',  // Transparent plot background
        paper_bgcolor: 'rgba(0,0,0,0)',  // Transparent paper background
    };

    renderOrUpdatePlot('cashflow_evolution_chart', data, layout);
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

function updateCharts(values, debtTermSheetHigh, debtTermSheetLow) {
    const { debtAmount, schedule, newRunway, isTaxDeductible } = debtTermSheetHigh;
    const { current_runway, cash_burn } = values;
    const { totalPaid, remainingBalance } = computeTotalPaidAndRemaining(schedule, 'totalCost', newRunway);

    const numberOfInvestors = computeNumberOfInvestors(debtAmount, cash_burn);

    const {
        valuationsDebt,
        valuationsEquity,
        newOwnershipDebt,
        newOwnershipEquity,
        retainedValuesDebt,
        retainedValuesEquity
    } = computeValuationMetrics(values, debtTermSheetHigh, 6);

    // Update elements applicable to all scenarios
    // Update cards value
    document.getElementById('amountRaised').textContent = formatToCurrency(debtAmount);
    document.getElementById('retainedOwnership').textContent = formatToPercentage(newOwnershipDebt - newOwnershipEquity);
    document.getElementById('numberInvestors').textContent = numberOfInvestors;

    // Update modal cards value
    document.getElementById('modalTargetAmount').textContent = formatToCurrency(debtAmount);
    document.getElementById('modalNumberInvestors').textContent = numberOfInvestors;

    // Update charts
    chartDebtRatingRadar(debtTermSheetHigh, debtTermSheetLow);
    chartYearlyPayments(schedule, isTaxDeductible);

    // Update elements applicable to non-profitable businesses
    if (!isNearProfitableCompany) {
        // Update cards value
        document.getElementById('additionalRunway').textContent = Math.round(newRunway - current_runway) + " months";
        document.getElementById('increasedValuation').textContent = formatToCurrency(computeValuationIncrease(valuationsDebt, current_runway, newRunway));

        // Update charts
        chartCostComparison(totalPaid, remainingBalance, retainedValuesDebt, retainedValuesEquity);
        // chartRetainedValue(retainedValuesDebt, retainedValuesEquity, current_runway);
        chartCashFlowsEvolution(values, debtTermSheetHigh);
    }

    if (isProfitableCompany) {
        document.getElementById('afterTaxCostOfDebt').textContent = formatToPercentage(debtTermSheetHigh.afterTaxCostOfDebt);
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

    // Stop computation if the user is still editing
    if (isEditing) {
        return
    }

    const isARRTooLow = triggerLowARRAlert(values.arr, values.cash_burn)
    if (isARRTooLow) {
        hideElement('result-container');
        return;
    }

    // Overwrite Klymb advisory since we decided to remove the field
    values.klymb_advisory_service = true

    // Check high growth business
    isProfitableCompany = values.cash_burn < 0;
    isGrowthCompany = (-12 * values.cash_burn) > growthThreshold;
    isNearProfitableCompany = isProfitableCompany

    // Compute debt informations
    const debtTermSheetHigh = createDebtTermSheet(values);
    const debtTermSheetLow = createDebtTermSheet(values, -0.2);

    // Show analysis if and only if the debt estimated is positive
    if (debtTermSheetHigh.debtAmount <= 0) {
        hideElement('result-container');
        return;
    }

    // Display warning if amount to raise exceeds maximum
    if (debtTermSheetHigh.amountToRaiseExceeded) {
        showElement('debt-exceeded-container');
    } else {
        hideElement('debt-exceeded-container');
    }

    // Generate / update charts and display
    showElement('result-container');
    updateCharts(values, debtTermSheetHigh, debtTermSheetLow);
    
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

// Capture that the user is still editing
inputs.forEach(input => {
    // Set isEditing to true when the input is focused
    input.addEventListener('focus', () => {
        isEditing = true;
    });

    // Set isEditing to false after validation is done on blur
    input.addEventListener('blur', (event) => {
        isEditing = false;
        updateResults()
    });
    input.addEventListener('keydown', (event) => {
        isEditing = false;
        updateResults();
    });
});

//////////////////
// Email Modal Logic
//////////////////

const emailModal = document.getElementById('email-modal');
const modalCloseButton = document.getElementById('modal-close-button');
const emailSubmitButton = document.getElementById('email-submit-button');
const emailInput = document.getElementById('email-input');

// Variable to track if modal has been dismissed
let modalDismissed = false;

// Function to check if email is saved in cookie
function getEmailFromCookie() {
    const name = "userEmail=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(name) === 0) {
            return c.substring(name.length, c.length);
        }
    }
    return null;
}

// Function to set email in cookie
function setEmailCookie(email) {
    const d = new Date();
    d.setTime(d.getTime() + (365*24*60*60*1000)); // Expires in 1 year
    const expires = "expires="+ d.toUTCString();
    document.cookie = "userEmail=" + email + ";" + expires + ";path=/";
}

// Function to show the modal
function showEmailModal() {
    emailModal.style.display = 'block';
}

// Function to hide the modal and remove blur
function hideEmailModal() {
    emailModal.style.display = 'none';
}

// Check if email is already saved
let savedEmail = getEmailFromCookie();

// Event listener for close button
modalCloseButton.addEventListener('click', function() {
    hideEmailModal();
    modalDismissed = true; // Update the flag
});

// Event listener for submit button
emailSubmitButton.addEventListener('click', function() {
    const email = emailInput.value.trim();
    if (email) {
        // Simple email validation
        if (validateEmail(email)) {
            setEmailCookie(email);
            savedEmail = email;
            hideEmailModal();
            modalDismissed = true; // Update the flag
        } else {
            emailInput.classList.add('input-error');
        }
    } else {
        emailInput.classList.add('input-error');
    }
});

// Function to validate email format
function validateEmail(email) {
    // Basic email regex pattern
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
}

// Modify updateResults function to show modal after results are displayed
const originalUpdateResults = updateResults;
updateResults = function() {
    originalUpdateResults.apply(this, arguments);
    if (!savedEmail && !modalDismissed && document.getElementById('result-container').classList.contains('show')) {
        showEmailModal();
    }
};