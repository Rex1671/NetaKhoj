var map = L.map('map').setView([22.9734, 78.6569], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

function cleanName(name) {
    if (!name) return "";
    return name.trim().toUpperCase().replace(/[^\w\s]/g, '');
}

let constituencyData = {};
fetch('data/constituency_data.json')
    .then(res => res.json())
    .then(data => {
       
        constituencyData = {};
        for (let key in data) {
            const cleanKey = cleanName(key);
            constituencyData[cleanKey] = data[key];
        }
    });

fetch('data/india_parliamentary.geojson')
    .then(response => response.json())
    .then(geojson => {

        function style(feature) {
            return {
                color: '#3388ff',
                weight: 3,
                fillOpacity: 0.1
            };
        }

       function onEachFeature(feature, layer) {
    layer.on('click', function() {
        const pcName = cleanName(feature.properties.pc_name);
        const data = constituencyData[pcName];
        const today = new Date();

        if (!data) {
            layer.bindPopup(`<b>Constituency:</b> ${feature.properties.pc_name}<br>No data available.`).openPopup();
            return;
        }

        let html = `<b>Constituency:</b> ${feature.properties.pc_name}<br>`;

       
       if (data.MP) {
   
    const mpPage = `http://localhost:3000/member?name=${encodeURIComponent(data.MP.name)}&type=MP`;
    html += `<br><b>Lok Sabha MP:</b> <a href="${mpPage}" target="_blank">${data.MP.name}</a> (${data.MP.party})<br>`;
    html += `Term: ${data.MP.term_start_date} - ${data.MP.term_end_date}<br>`;
}
else {
            html += `<br><b>Lok Sabha MP:</b> Not available<br>`;
        }

       
        let currentMLAs = [];
        if (data.MLAs && data.MLAs.length > 0) {
            currentMLAs = data.MLAs.filter(mla => {
                let start = new Date(mla.term_start_date);
                let end = mla.term_end_date.toLowerCase() === 'in office' ? today : new Date(mla.term_end_date);
                return start <= today && today <= end;
            });
        }

     
       if (currentMLAs.length > 0) {
    html += `<br><b>Current MLA(s):</b><br>`;
    currentMLAs.forEach(mla => {
        const mlaPage = `http://localhost:3000/member?name=${encodeURIComponent(mla.name)}&type=MLA`;
        html += `- <a href="${mlaPage}" target="_blank">${mla.name}</a> (${mla.party}) [${mla.ac_name}]<br>`;
        html += `  Term: ${mla.term_start_date} - ${mla.term_end_date}<br>`;
    });
} else {
    html += `<br><b>Current MLA(s):</b> Not available<br>`;
}

        layer.bindPopup(html).openPopup();
    });
}





        L.geoJSON(geojson, {
            style: style,
            onEachFeature: onEachFeature
        }).addTo(map);
    });
