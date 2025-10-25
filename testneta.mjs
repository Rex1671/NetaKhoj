import { getCandidateData } from './findNeta.js'; // adjust path if needed

(async () => {
    // Hardcoded candidate details
    const name = "Joba Majhi";
    const constituency = "Singhbhum";
    const party = "Jharkhand Mukti Morcha";

    console.log(`Fetching candidate data for: ${name}, ${constituency}, ${party}\n`);

    const data = await getCandidateData(name, constituency, party);

    if (!data) {
        console.log("No data found for this candidate.");
    } else {
        console.log("Candidate data fetched successfully:");
        console.log(JSON.stringify(data, null, 2));
    }
})();
