document.addEventListener("DOMContentLoaded", function() {
    const form = document.querySelector('form');
    const inputs = form.querySelectorAll('input, select');
    const minRunway = 12;

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

    function triggerRunwayAlert(event) {
        const input = event.target;
        const runway = input.value;
        if (runway !== null && runway < 12) {
            showElement('runway-container');
        } else {
            hideElement('runway-container');
        }
    }

    function captureValues() {
        const values = {};
        inputs.forEach(input => {
            if (input.type === 'number') {
                values[input.name] = input.value ? parseFloat(input.value) || 0 : null;
            }
            else if (input.classList.contains('number-input')) {
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
        return values;
    }

    function hasNullValues(values) {
        for (const key in values) {
            if (values[key] === null) {
                return true;
            }
        }
        return false;
    }

    function calculateDebtRange(arr, klymb_advisory_service) {
        let debtAmountMin, debtAmountMax;
        if (klymb_advisory_service) {
            debtAmountMin = 0.75 * arr;
            debtAmountMax = 1.5 * arr;
        } else {
            debtAmountMin = 0.5 * arr;
            debtAmountMax = 1.0 * arr;
        }
        return { debtAmountMin, debtAmountMax };
    }

    function calculateBurnMultiple(arr, cash_burn, revenue_growth) {
        const arrIncrease = arr * revenue_growth / 12
        const burnMultiple = cash_burn / arrIncrease
        return burnMultiple
    }

    function scoreBooster(score, isAdvised=false, advisoryBonus=0.1) {
        if (isAdvised) {
            score = Math.min(1, score * (1 + advisoryBonus))
        }
        return score
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
        score += sigmoidAdjusted(revenue_growth, 0, 1.5) * 30; // Revenue growth weighted at 20%
        score += sigmoidAdjusted(gross_margin, 50, 80) * 10; // Gross margin weighted at 20%
        score += sigmoidAdjusted(current_runway, 9, 14) * 10; // Runway weighted at 10%
        score += sigmoidAdjusted(current_valuation / arr, 12, 5) * 20; // Valuation weighted at 20%
        score += sigmoidAdjusted(calculateBurnMultiple(arr, cash_burn, revenue_growth), 2.5, 1) * 30; // Burn multiple weighted at 20%

        // Normalize score to 0-1 range
        score = Math.max(0, Math.min(1, score / 100));
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

    function createDebtTermSheet(values) {
        const { arr, current_runway, klymb_advisory_service } = values;
        
        const { debtAmountMin, debtAmountMax } = calculateDebtRange(arr, klymb_advisory_service);
        const score = calculateScore(values);
        const debtAmount = roundToSignificantDigits(calculateDebtParam(score, debtAmountMin, debtAmountMax));
        const scoreBoost = scoreBooster(score, klymb_advisory_service, 0.1)

        let debtTermSheet = {
            isRunwayEnough: true,
            debtAmount: debtAmount,
            warrantCoverage: calculateDebtParam(scoreBoost, 0.075, 0.2, 0.005, reverseScale=true, isPercentage=true, isInteger=false),
            warrantDiscount: calculateDebtParam(scoreBoost, 0.1, 0.3, 0.05, reverseScale=true, isPercentage=true, isInteger=false),
            interestRate: calculateDebtParam(scoreBoost, 0.1, 0.16, 0.005, reverseScale=true, isPercentage=true, isInteger=false),
            interestOnlyPeriod: calculateDebtParam(scoreBoost, 6, 24, 6, reverseScale=false, isPercentage=false, isInteger=true),
            straightAmortization: calculateDebtParam(scoreBoost, 18, 36, 6, reverseScale=false, isPercentage=false, isInteger=true),
            arrangementFees: calculateDebtParam(scoreBoost, 0.01, 0.03, 0.005, reverseScale=true, isPercentage=true, isInteger=false),
            exitFees: calculateDebtParam(scoreBoost, 0, 0.03, 0.005, reverseScale=true, isPercentage=true, isInteger=false),
        };

        if (current_runway < minRunway) {
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
        const newRunway = Math.round(newCash / cash_burn);
    
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
    
        // Calculate monthly principal payment for the amortization period
        const monthlyPrincipalPayment = debtAmount / straightAmortization;
    
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

    function aggregateSchedule(schedule) {
        const yearlyData = [];
        let currentYear = { interest: 0, fees: 0, principal: 0 };
    
        schedule.forEach((month, index) => {
            currentYear.interest += month.interest;
            currentYear.fees += month.fees;
            currentYear.principal += month.principal;
    
            if ((index + 1) % 12 === 0) {
                yearlyData.push(currentYear);
                currentYear = { interest: 0, fees: 0, principal: 0 };
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

    function computeValuationMetrics(values, debtTermSheet, runway, transitionPeriod=6) {
        const { revenue_growth, current_valuation, current_ownership } = values;
        const { debtAmount } = debtTermSheet;
    
        const monthlyGrowthRate = yearlyToMonthlyGrowthRate(revenue_growth);
        const valuationsDebt = computeGrowingValuation(current_valuation, monthlyGrowthRate, runway);
        
        // Compute equity valuations with transition period
        const valuationsEquity = computeEquityValuation(debtTermSheet, valuationsDebt, transitionPeriod);
    
        const newOwnershipDebt = current_ownership;
        const newOwnershipEquity = simulateNewOwnership(current_valuation, current_ownership, debtAmount);
    
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
        const chartElement = document.getElementById(chartId);

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
        const emptyList = Array(nbMonths - 1).fill('');
        const emptyPosition = Array(nbMonths - 1).fill('top');
        const valueDifference = retainedValuesDebt.map((item, index) => item - retainedValuesEquity[index]);
    
        // Split the data into two segments: solid line and dotted line
        const solidLineEndIndex = currentRunway - 1;
        const dottedLineStartIndex = currentRunway;
    
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
            text: emptyList.slice(0, solidLineEndIndex).concat(['Initial runway']),
            textposition: emptyPosition.slice(0, solidLineEndIndex).concat(['left']),
            hovertemplate: '%{y:.3s}<extra></extra>'
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
            text: emptyList.slice(dottedLineStartIndex - 1).concat(['Increased runway']),
            textposition: emptyPosition.slice(dottedLineStartIndex - 1).concat(['left']),
            hovertemplate: '%{y:.3s}<extra></extra>'
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
    
    function chartYearlyPayments(schedule) {
        const yearlyData = aggregateSchedule(schedule);
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
    
        const layout = {
            // width: 400,
            // height: 240,
            title: 'Yearly loan amortization forecast',
            barmode: 'stack',
            xaxis: { fixedrange: true },
            yaxis: { title: 'Amount (€)', fixedrange: true },
            showlegend: false,
            hovermode: 'closest',
            plot_bgcolor: 'rgba(0,0,0,0)',  // Transparent plot background
            paper_bgcolor: 'rgba(0,0,0,0)',  // Transparent paper background
        };
    
        renderOrUpdatePlot('payment_schedule_chart', data, layout, onlyRender=true);
    }

    function chartDebtRatingRadar(debtTermSheet, irr) {
        // Radar plot data
        const styler = (x) => `<br><span style='color:#8434B4; font-size:10; font-style: italic;'>${x}</span>`;
        
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
            margin: { t: 30, r: 40, b: 30, l: 40 },
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
                        size: 16,
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
                    text: `<b>IRR: ${(irr * 100).toFixed(2)}%</b>`,
                    xref: "paper", 
                    yref: "paper",
                    font: { size: 14 },
                    x: 0.5,
                    y: 0.5,
                    showarrow: false
                }
            ]
        };

        // Update layout for mobile
        const mediaQuery = window.matchMedia('(max-width: 767px)');
        if (mediaQuery.matches) { 
            layout.polar.angularaxis.tickfont.size = 8;  // Smaller font size for mobile
            layout.annotations[0].font.size = 9;  // Smaller annotation font size for mobile
            layout.width = 300;  // Smaller width for mobile
            layout.height = 300;  // Smaller height for mobile
        }

        renderOrUpdatePlot('debt_radar_chart', data, layout);
    }

    function showElement(elementId) {
        const container = document.getElementById(elementId);
        container.classList.add('show');
    }

    function hideElement(elementId) {
        const container = document.getElementById(elementId);
        container.classList.remove('show');
    }

    function updateCharts(values, debtTermSheet, schedule, newRunway, irr) {
        const { totalPaid, remainingBalance } = computeTotalPaidAndRemaining(schedule, 'totalCost', newRunway);
    
        const {
            valuationsDebt,
            valuationsEquity,
            newOwnershipDebt,
            newOwnershipEquity,
            retainedValuesDebt,
            retainedValuesEquity
        } = computeValuationMetrics(values, debtTermSheet, newRunway, 6);
    
        // Update cards value
        document.getElementById('amountRaised').textContent = formatToCurrency(debtTermSheet.debtAmount);
        document.getElementById('additionalRunway').textContent = Math.round(newRunway - values.current_runway);
        document.getElementById('increasedValuation').textContent = formatToCurrency(computeValuationIncrease(valuationsDebt, values.current_runway, newRunway));
        document.getElementById('retainedOwnership').textContent = formatToPercentage(newOwnershipDebt - newOwnershipEquity);
    
        // Update charts with animation
        chartDebtRatingRadar(debtTermSheet, irr);
        chartCostComparison(totalPaid, remainingBalance, retainedValuesDebt, retainedValuesEquity);
        chartRetainedValue(retainedValuesDebt, retainedValuesEquity, values.current_runway);
        chartYearlyPayments(schedule);
    }

    function updateResults() {
        // Update form values
        const values = captureValues();

        // Show analysis if and only if all values are filled
        if (hasNullValues(values)) {
            hideElement('result-container');
            return;
        }

        showElement('result-container');

        // Compute debt informations
        const debtTermSheet = createDebtTermSheet(values);
        const schedule = generatePaymentSchedule(debtTermSheet);
        const newRunway = computeNewCashRunway(values, debtTermSheet);
        const cashFlows = getCashFlowsArray(debtTermSheet.debtAmount, schedule)
        const irr = XIRR(cashFlows)
        const {totalPaid, remainingBalance} = computeTotalPaidAndRemaining(schedule, 'totalCost', newRunway);

        // Generate / update charts
        updateCharts(values, debtTermSheet, schedule, newRunway, irr)
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
    const runwayInput = document.querySelector('#current_runway');
    runwayInput.addEventListener('blur', triggerRunwayAlert);

    // Add event listener to changes in the form
    inputs.forEach(input => {
        input.addEventListener('blur', updateResults);
        input.addEventListener('keydown', updateResults);
    });
    const klymbAdvisory = document.getElementById('klymb_advisory_service');
    klymbAdvisory.addEventListener('change', updateResults);

    // Initial capture on page load
    updateResults();
});
