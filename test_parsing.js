const parseIncomeSeries = (incomeText) => {
    if (!incomeText) return [];
    const parts = incomeText.split('**').filter(p => p.trim());
    const years = [];

    for (let i = 0; i < parts.length; i += 2) {
        if (i + 1 < parts.length) {
            const year = parts[i].trim();
            const amount = parts[i + 1].trim()
                .replace(/<\/?b>/g, '')
                .replace(/<\/?[^>]+(>|$)/g, '');

            console.log(`i=${i}, year="${year}", amount="${amount}"`);

            if (year && amount && year !== 'None' && !amount.includes('Rs 0')) {
                years.push({ year, amount });
            }
        }
    }

    return years;
};

const input = "**  <b>Nil</b> **   **  <b>Nil</b> **   **  <b>Nil</b> **   **  <b>Nil</b> **   **  <b>Nil</b>";
const result = parseIncomeSeries(input);
console.log(JSON.stringify(result, null, 2));
