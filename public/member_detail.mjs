function getQueryParams() {
  const params = {};
  window.location.search.substring(1).split('&').forEach(pair => {
    const [key, value] = pair.split('=');
    params[key] = decodeURIComponent(value || '');
  });
  return params;
}

function formatCurrency(value) {
  if (!value || value === 'Nil' || value === 'N/A') return 'N/A';
  const match = String(value).match(/Rs\s*([\d,]+)/);
  if (match) {
    const num = parseInt(match[1].replace(/,/g, ''));
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(2)} K`;
    return `₹${num}`;
  }
  return value;
}

function createStatCard(title, mpValue, natAvg, stateAvg, icon, gradient) {
  const parseValue = (val) => {
    if (!val || val === 'N/A') return 0;
    return parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;
  };

  const mpNum = parseValue(mpValue);
  const natNum = parseValue(natAvg);
  const stateNum = parseValue(stateAvg);

  const maxVal = Math.max(mpNum, natNum, stateNum) || 1;
  const mpPct = (mpNum / maxVal * 100);
  const natPct = (natNum / maxVal * 100);
  const statePct = (stateNum / maxVal * 100);

  return `
        <div class="stat-card">
          <div class="stat-header">
            <div class="stat-title">${title}</div>
            <div class="stat-icon" style="background: ${gradient};">${icon}</div>
          </div>
          <div class="stat-value">${mpValue || 'N/A'}</div>
          <div class="comparison-bars">
            <div class="comparison-bar">
              <span class="bar-label">Selected</span>
              <div class="bar-container">
                <div class="bar-fill" style="width: ${mpPct}%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
              </div>
              <span class="bar-value">${mpValue || 'N/A'}</span>
            </div>
            ${natAvg && natAvg !== 'N/A' ? `
            <div class="comparison-bar">
              <span class="bar-label">National Avg</span>
              <div class="bar-container">
                <div class="bar-fill" style="width: ${natPct}%; background: linear-gradient(90deg, #10b981, #059669);"></div>
              </div>
              <span class="bar-value">${natAvg}</span>
            </div>
            ` : ''}
            ${stateAvg && stateAvg !== 'N/A' ? `
            <div class="comparison-bar">
              <span class="bar-label">State Avg</span>
              <div class="bar-container">
                <div class="bar-fill" style="width: ${statePct}%; background: linear-gradient(90deg, #f59e0b, #d97706);"></div>
              </div>
              <span class="bar-value">${stateAvg}</span>
            </div>
            ` : ''}
          </div>
        </div>
      `;
}

function toggleSection(id) {
  const content = document.getElementById(id);
  const btn = event.target;
  content.classList.toggle('active');
  btn.textContent = content.classList.contains('active') ? 'Hide Details' : 'Show Details';
}

window.toggleSection = toggleSection;

// Global variables to store current data for WebSocket updates
let currentMemberData = null;
let currentCandidateData = null;

async function loadMemberData() {
  const params = getQueryParams();
  const memberName = params.name;
  const memberType = params.type;

  try {
    const response = await fetch(`/prs?name=${encodeURIComponent(memberName)}&type=${encodeURIComponent(memberType)}`);
    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let constituency = 'N/A';
    let party = 'N/A';

    if (memberType === 'MP') {
      const profileSection = doc.querySelector('.mp_profile_header_info');
      if (profileSection) {
        const constituencyDiv = profileSection.querySelector('.mp_constituency');
        if (constituencyDiv) {
          constituency = constituencyDiv.textContent.replace('Constituency :', '').trim();
        }
        const partyLink = profileSection.querySelector('.mp_state a[href*="mp_political_party"]');
        if (partyLink) {
          party = partyLink.textContent.trim().split('(')[0].trim();
        }
      }
    } else {
      const profileSection = doc.querySelector('.mp_profile_header_info');
      if (profileSection) {
        const constituencyDiv = profileSection.querySelector('.mp_constituency .field-item');
        if (constituencyDiv) {
          constituency = constituencyDiv.textContent.trim();
        }
        const partyLink = profileSection.querySelector('.mp_state a[href*="mp_political_party"]');
        if (partyLink) {
          party = partyLink.textContent.trim().split('(')[0].trim();
        }
      }
    }
    document.getElementById("loading-screen")

    let candidateData = null;
    let tempId = null;

    try {
      const candidateResponse = await fetch(`/candidate?name=${encodeURIComponent(memberName)}&constituency=${encodeURIComponent(constituency)}&party=${encodeURIComponent(party)}`);
      if (candidateResponse.ok) {
        candidateData = await candidateResponse.json();
        tempId = candidateData.tempId;
      }
    } catch (err) {
      console.error('Error fetching candidate data:', err);
    }

    if (memberType === 'MP') {
      currentMemberData = renderMPDashboard(doc, memberName, candidateData);
    } else {
      currentMemberData = renderMLADashboard(doc, memberName, candidateData);
    }
    currentCandidateData = candidateData;

    const ws = new WebSocket("ws://localhost:3000");

    ws.addEventListener("open", () => {
      console.log("WebSocket connected");
      ws.send(JSON.stringify({
        type: "subscribe",
        tempId, // ✅ send back the unique tempId
        name: memberName,
        constituency,
        party
      }));
    });

    ws.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      if (data.updatedData) {
        console.log("Received updated tables via WebSocket:", data.updatedData);

        // Directly update the DOM with the new table HTML
        if (data.updatedData.attendanceTable) {
          const attendanceDiv = document.getElementById('attendance-content');
          if (attendanceDiv) attendanceDiv.innerHTML = data.updatedData.attendanceTable;
        }
        if (data.updatedData.debatesTable) {
          const debatesDiv = document.getElementById('debates-content');
          if (debatesDiv) debatesDiv.innerHTML = data.updatedData.debatesTable;
        }
        if (data.updatedData.questionsTable) {
          const questionsDiv = document.getElementById('questions-content');
          if (questionsDiv) questionsDiv.innerHTML = data.updatedData.questionsTable;
        }
      }
    });
  } catch (err) {
    console.error(err);
    document.getElementById('content').innerHTML = `
          <div class="error-card">
            <div style="font-size: 5em; margin-bottom: 20px;">⚠️</div>
            <div style="font-size: 1.8em; font-weight: 800; color: #e74c3c; margin-bottom: 15px;">Unable to Load Profile</div>
            <div style="color: #64748b; font-size: 1.1em;">Please try again later or check the member name.</div>
          </div>
        `;
  }

}

function renderMPDashboard(doc, memberName, candidateData) {
  const profileSection = doc.querySelector('.mp_profile_header_info');

  const name = profileSection?.querySelector('.mp-name h1 a, .mp-name h1')?.textContent.trim() || memberName;

  let imageUrl = profileSection?.querySelector('.field-name-field-image img')?.getAttribute('src') || '';
  if (imageUrl && !imageUrl.startsWith('http')) imageUrl = 'https://prsindia.org' + imageUrl;

  let state = 'N/A';
  const stateLink = profileSection?.querySelector('.mp_state a');
  if (stateLink) {
    state = stateLink.textContent.trim().split('(')[0].trim();
  }

  const constituency = profileSection?.querySelector('.mp_constituency')?.textContent.replace('Constituency :', '').trim() || 'N/A';

  let party = 'N/A';
  const partyLink = Array.from(profileSection?.querySelectorAll('.mp_state a') || [])
    .find(a => a.href.includes('mp_political_party'));
  if (partyLink) party = partyLink.textContent.trim().split('(')[0].trim();

  const personalSection = doc.querySelector('.col-md-4.personal_profile_parent');

  let age = 'N/A';
  let gender = 'N/A';
  if (personalSection) {
    const genderDivs = personalSection.querySelectorAll('.gender');
    if (genderDivs.length > 0) age = genderDivs[0].textContent.replace('Age :', '').trim();
    if (genderDivs.length > 1) gender = genderDivs[1].textContent.trim();
  }

  const education = personalSection?.querySelector('.education a')?.textContent.trim() || 'N/A';
  const termStart = profileSection?.querySelector('.term_start .date-display-single')?.textContent.trim() || 'N/A';
  const termEnd = profileSection?.querySelector('.term_end')?.textContent.replace('End of Term :', '').trim() || 'N/A';
  const noOfTerm = profileSection?.querySelector('.age:nth-of-type(2)')?.textContent.replace('No. of Term :', '').trim() || 'N/A';

  const perfSection = doc.querySelector('.mp-parliamentary-performance');

  const attendance = perfSection?.querySelector('.mp-attendance .field-name-field-attendance .field-item')?.textContent.trim() || 'N/A';
  const natAttendance = perfSection?.querySelector('.mp-attendance .field-name-field-national-attendance .field-item')?.textContent.trim() || 'N/A';
  const stateAttendance = perfSection?.querySelector('.mp-attendance .field-name-field-state-attendance .field-item')?.textContent.trim() || 'N/A';

  const debates = perfSection?.querySelector('.mp-debate .field-name-field-author .field-item')?.textContent.trim() || 'N/A';
  const natDebates = perfSection?.querySelector('.mp-debate .field-name-field-national-debate .field-item')?.textContent.trim() || 'N/A';
  const stateDebates = perfSection?.querySelector('.mp-debate .field-name-field-state-debate .field-item')?.textContent.trim() || 'N/A';

  const questions = perfSection?.querySelector('.mp-questions .field-name-field-total-expenses-railway .field-item')?.textContent.trim() || 'N/A';
  const natQuestions = perfSection?.querySelector('.mp-questions .field-name-field-national-questions .field-item')?.textContent.trim() || 'N/A';
  const stateQuestions = perfSection?.querySelector('.mp-questions .field-name-field-state-questions .field-item')?.textContent.trim() || 'N/A';

  const pmb = perfSection?.querySelector('.mp-pmb .field-name-field-source .field-item')?.textContent.trim() || 'N/A';
  const natPMB = perfSection?.querySelector('.mp-pmb .field-name-field-national-pmb .field-item')?.textContent.trim() || 'N/A';

  const attendanceTable = doc.querySelector('#block-views-mps-attendance-block table');
  const debatesTable = doc.querySelector('#block-views-mps-debate-related-views-block table');
  const questionsTable = doc.querySelector('#block-views-mp-related-views-block-2222 table');

  const data = {
    name, imageUrl, state, constituency, party, age, gender, education, termStart, termEnd, noOfTerm,
    attendance, natAttendance, stateAttendance,
    debates, natDebates, stateDebates,
    questions, natQuestions, stateQuestions,
    pmb, natPMB,
    attendanceTable: attendanceTable?.outerHTML || '',
    debatesTable: debatesTable?.outerHTML || '',
    questionsTable: questionsTable?.outerHTML || '',
    type: 'MP'
  };

  renderDashboard(data, candidateData);
  return data;
}

function renderMLADashboard(doc, memberName, candidateData) {
  const profileSection = doc.querySelector('.mp_profile_header_info');

  let name = memberName;
  const nameSelectors = [
    '.mla-name h3 .field-item',
    '.mp-name h3 .field-item',
    '.field-name-title-field .field-item',
    '.mla-name .field-item',
    'h3 .field-item'
  ];
  for (const selector of nameSelectors) {
    const el = profileSection?.querySelector(selector);
    if (el && el.textContent.trim()) { name = el.textContent.trim(); break; }
  }

  const imageSelectors = [
    '.field-name-field-mla-profile-image img',
    '.personal_profile_parent img',
    'img.img-responsive'
  ];

  let rawSrc = '';
  for (const sel of imageSelectors) {
    const el = profileSection?.querySelector(sel);
    if (el) {
      rawSrc = el.getAttribute('src') || '';
      if (rawSrc) break;
    }
  }

  if (!rawSrc) {
    for (const sel of imageSelectors) {
      const el = doc.querySelector(sel);
      if (el) {
        rawSrc = el.getAttribute('src') || '';
        if (rawSrc) break;
      }
    }
  }

  function normalizeImageUrl(raw) {
    if (!raw) return '';
    if (!raw.startsWith('http')) {
      if (!raw.startsWith('/')) raw = '/' + raw;
      raw = 'https://prsindia.org' + raw;
    }

    try {
      const u = new URL(raw);
      const decoded = u.pathname.split('/').map(seg => {
        try { return decodeURIComponent(seg); } catch (e) { return seg; }
      });
      u.pathname = decoded.map(seg => encodeURIComponent(seg)).join('/');
      return u.toString();
    } catch (err) {
      try { raw = decodeURIComponent(raw); } catch (e) { }
      return raw.replace(/ /g, '%20');
    }
  }

  let imageUrl = normalizeImageUrl(rawSrc);

  let state = 'N/A';
  const stateLink = doc.querySelector('.mp_basic-info .mp_state a, .mp-basic-info .mp_state a');
  if (stateLink) state = stateLink.textContent.trim();

  let constituency = 'N/A';
  const constituencyDiv = doc.querySelector('.mp_constituency .field-item');
  if (constituencyDiv) {
    constituency = constituencyDiv.textContent.trim();
  }

  let party = 'N/A';
  const partyLink = [...doc.querySelectorAll('.mp_state')].find(div => div.textContent.includes('Party'))?.querySelector('a');
  if (partyLink) party = partyLink.textContent.trim();

  let age = 'N/A';
  const allPersonalSections = doc.querySelectorAll('.personal_profile_parent');
  for (const section of allPersonalSections) {
    const ageDiv = section.querySelector('.age');
    if (ageDiv) {
      const fieldItem = ageDiv.querySelector('.field-item');
      if (fieldItem) { age = fieldItem.textContent.trim(); break; }
    }
  }

  let gender = 'N/A';
  for (const section of allPersonalSections) {
    const genderDiv = section.querySelector('.gender');
    if (genderDiv) {
      const link = genderDiv.querySelector('a');
      if (link) { gender = link.textContent.trim(); break; }
    }
  }

  let education = 'N/A';
  for (const section of allPersonalSections) {
    const eduDiv = section.querySelector('.education');
    if (eduDiv) {
      const link = eduDiv.querySelector('a');
      if (link) { education = link.textContent.trim(); break; }
    }
  }

  let termStart = 'N/A';
  const termStartEl = [...doc.querySelectorAll('.term_end')].find(div => div.textContent.includes('Start'))?.querySelector('.field-item');
  if (termStartEl) termStart = termStartEl.textContent.trim();

  let termEnd = 'N/A';
  const termEndEl = [...doc.querySelectorAll('.term_end')].find(div => div.textContent.includes('End'))?.querySelector('.field-item');
  if (termEndEl) termEnd = termEndEl.textContent.trim();

  renderDashboard({
    name, imageUrl, state, constituency, party, age, gender, education, termStart, termEnd,
    attendance: 'N/A', natAttendance: 'N/A', stateAttendance: 'N/A',
    debates: 'N/A', natDebates: 'N/A', stateDebates: 'N/A',
    questions: 'N/A', natQuestions: 'N/A', stateQuestions: 'N/A',
    pmb: 'N/A', natPMB: 'N/A',
    attendanceTable: '', debatesTable: '', questionsTable: '',
    type: 'MLA'
  }, candidateData);
}

function renderDashboard(data, candidateData = null) {
  const hasPerformance = data.attendance !== 'N/A' && data.attendance !== '';

  let statsHTML = '';
  if (hasPerformance) {
    const stats = [];

    if (data.attendance !== 'N/A') {
      stats.push(createStatCard('Attendance', data.attendance, data.natAttendance, data.stateAttendance, '📊', 'linear-gradient(135deg, #667eea, #764ba2)'));
    }
    if (data.debates !== 'N/A' && data.debates !== '0') {
      stats.push(createStatCard('Debates', data.debates, data.natDebates, data.stateDebates, '💬', 'linear-gradient(135deg, #f093fb, #f5576c)'));
    }
    if (data.questions !== 'N/A' && data.questions !== '0') {
      stats.push(createStatCard('Questions', data.questions, data.natQuestions, data.stateQuestions, '❓', 'linear-gradient(135deg, #4facfe, #00f2fe)'));
    }
    if (data.pmb !== 'N/A') {
      stats.push(createStatCard('PMB', data.pmb, data.natPMB, 'N/A', '📄', 'linear-gradient(135deg, #43e97b, #38f9d7)'));
    }

    if (stats.length > 0) {
      statsHTML = `<div class="stats-grid">${stats.join('')}</div>`;
    }
  }

  let detailsHTML = '';

  if (data.attendanceTable) {
    detailsHTML += `
          <div class="details-section">
            <div class="section-header">
              <div class="chart-title"><span class="chart-title-icon">📋</span>Attendance Details</div>
              <button class="toggle-btn" onclick="toggleSection('attendance-content')">Show Details</button>
            </div>
            <div id="attendance-content" class="collapsible-content">
              ${data.attendanceTable}
            </div>
          </div>
        `;
  }
  if (data.debatesTable) {
    detailsHTML += `
          <div class="details-section">
            <div class="section-header">
              <div class="chart-title"><span class="chart-title-icon">💬</span>Debates Participation</div>
              <button class="toggle-btn" onclick="toggleSection('debates-content')">Show Details</button>
            </div>
            <div id="debates-content" class="collapsible-content">
              ${data.debatesTable}
            </div>
          </div>
        `;
  }
  if (data.questionsTable) {
    detailsHTML += `
          <div class="details-section">
            <div class="section-header">
              <div class="chart-title"><span class="chart-title-icon">❓</span>Questions Asked</div>
              <button class="toggle-btn" onclick="toggleSection('questions-content')">Show Details</button>
            </div>
            <div id="questions-content" class="collapsible-content">
              ${data.questionsTable}
            </div>
          </div>
        `;
  }

  if (candidateData) {
    const crimeCases = candidateData.crimeOMeter?.cases || candidateData.criminalCases?.pendingCases?.length || 0;
    const isClean = crimeCases === 0;

    let totalAssets = 0;
    let totalLiabilities = 0;

    if (candidateData.movableAssets) {
      candidateData.movableAssets.forEach(asset => {
        if (asset.total) {
          const match = asset.total.match(/Rs\s*([\d,]+)/);
          if (match) totalAssets += parseInt(match[1].replace(/,/g, ''));
        }
      });
    }

    if (candidateData.immovableAssets) {
      candidateData.immovableAssets.forEach(asset => {
        if (asset.total) {
          const match = asset.total.match(/Rs\s*([\d,]+)/);
          if (match) totalAssets += parseInt(match[1].replace(/,/g, ''));
        }
      });
    }

    if (candidateData.liabilities) {
      candidateData.liabilities.forEach(liability => {
        if (liability.total && liability.total !== 'Nil') {
          const match = liability.total.match(/Rs\s*([\d,]+)/);
          if (match) totalLiabilities += parseInt(match[1].replace(/,/g, ''));
        }
      });
    }

    detailsHTML += `
          <div class="details-section">
            <div class="section-header">
              <div class="chart-title"><span class="chart-title-icon">👤</span>Candidate Information</div>
            </div>
            
            <div class="asset-summary">
              <div class="asset-card">
                <div class="asset-card-title">Total Assets</div>
                <div class="asset-card-value">${formatCurrency('Rs ' + totalAssets)}</div>
              </div>
              <div class="asset-card">
                <div class="asset-card-title">Total Liabilities</div>
                <div class="asset-card-value">${formatCurrency('Rs ' + totalLiabilities)}</div>
              </div>
              <div class="asset-card">
                <div class="asset-card-title">Net Worth</div>
                <div class="asset-card-value">${formatCurrency('Rs ' + (totalAssets - totalLiabilities))}</div>
              </div>
              <div class="asset-card">
                <div class="asset-card-title">Criminal Cases</div>
                <div class="asset-card-value">
                  <span class="crime-indicator ${isClean ? 'crime-clean' : 'crime-pending'}">
                    ${isClean ? '✓' : '⚠️'} ${crimeCases}
                  </span>
                </div>
              </div>
            </div>

            ${candidateData.candidate ? `
              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 1.2em; font-weight: 700; margin-bottom: 15px; color: #1e293b;">Basic Information</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                  ${candidateData.candidate.age ? `<div><strong>Age:</strong> ${candidateData.candidate.age} years</div>` : ''}
                  ${candidateData.candidate.relation ? `<div><strong>Relation:</strong> ${candidateData.candidate.relation}</div>` : ''}
                  ${candidateData.candidate.voterEnrollment ? `<div><strong>Voter ID:</strong> ${candidateData.candidate.voterEnrollment}</div>` : ''}
                </div>
              </div>
            ` : ''}

            ${candidateData.profession ? `
              <div style="margin-bottom: 20px;">
                <h3 style="font-size: 1.2em; font-weight: 700; margin-bottom: 15px; color: #1e293b;">Profession</h3>
                <div style="background: #f8fafc; padding: 15px; border-radius: 12px;">
                  <div><strong>Self:</strong> ${candidateData.profession.self || 'N/A'}</div>
                  <div><strong>Spouse:</strong> ${candidateData.profession.spouse || 'N/A'}</div>
                </div>
              </div>
            ` : ''}
        `;

    if (candidateData.incomeTax && candidateData.incomeTax.length > 0) {
      const validTaxRecords = candidateData.incomeTax.filter(tax => tax.pan === 'Y' && tax.income && tax.income !== 'None');

      if (validTaxRecords.length > 0) {
        detailsHTML += `
              <div style="margin-top: 25px;">
                <div class="section-header">
                  <div class="chart-title"><span class="chart-title-icon">💰</span>Income Tax Returns (Last 5 Years)</div>
                  <button class="toggle-btn" onclick="toggleSection('income-content')">Show Details</button>
                </div>
                <div id="income-content" class="collapsible-content">
            `;

        validTaxRecords.forEach(tax => {
          const incomeYears = tax.income.split('**').filter(item => item.trim());

          if (incomeYears.length > 0) {
            detailsHTML += `
                  <div style="margin-bottom: 25px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 24px; border-radius: 18px; border: 2px solid #86efac; box-shadow: 0 4px 12px rgba(134, 239, 172, 0.15);">
                    <h4 style="font-size: 1.2em; font-weight: 800; color: #166534; margin-bottom: 15px; text-transform: capitalize; display: flex; align-items: center; gap: 10px;">
                      <span style="background: white; padding: 8px 14px; border-radius: 10px; font-size: 0.85em;">${tax.relation === 'self' ? '👤 Primary' : tax.relation === 'spouse' ? '💑 Spouse' : `👨‍👩‍👧 Dependent ${tax.relation.replace('dependent', '')}`}</span>
                      <span style="background: white; padding: 8px 14px; border-radius: 10px; font-size: 0.85em;">📋 PAN: ${tax.pan}</span>
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px;">
                `;

            incomeYears.forEach(yearIncome => {
              const parts = yearIncome.trim().split('Rs');
              if (parts.length >= 2) {
                const year = parts[0].trim();
                const amount = 'Rs' + parts[1].trim();
                const formattedAmount = formatCurrency(amount);

                detailsHTML += `
                      <div style="background: white; padding: 18px; border-radius: 14px; box-shadow: 0 3px 10px rgba(0,0,0,0.08); border-left: 4px solid #10b981; transition: all 0.3s ease; cursor: pointer;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.12)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 10px rgba(0,0,0,0.08)';">
                        <div style="font-size: 0.85em; color: #6b7280; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">📅 ${year}</div>
                        <div style="font-size: 1.4em; font-weight: 800; color: #059669;">${formattedAmount}</div>
                      </div>
                    `;
              }
            });

            detailsHTML += `
                    </div>
                  </div>
                `;
          }
        });

        detailsHTML += `
                </div>
              </div>
            `;
      }
    }

    if (candidateData.criminalCases && candidateData.criminalCases.pendingCases && candidateData.criminalCases.pendingCases.length > 0) {
      const validCases = candidateData.criminalCases.pendingCases.filter(c =>
        c.serialNo &&
        c.serialNo !== '---------No Cases--------' &&
        c.serialNo !== 'Serial No.' &&
        !c.court?.includes('IPC Sections Applicable')
      );

      if (validCases.length > 0) {
        detailsHTML += `
              <div style="margin-top: 25px;">
                <div class="section-header">
                  <div class="chart-title"><span class="chart-title-icon">⚖️</span>Criminal Cases (${validCases.length} Pending)</div>
                  <button class="toggle-btn" onclick="toggleSection('criminal-content')">Show Details</button>
                </div>
                <div id="criminal-content" class="collapsible-content">
                  <div style="overflow-x: auto;">
                    <table>
                      <thead>
                        <tr>
                          <th style="min-width: 50px;">S.No</th>
                          <th style="min-width: 150px;">FIR No</th>
                          <th style="min-width: 150px;">Case No</th>
                          <th style="min-width: 200px;">Court</th>
                          <th style="min-width: 200px;">IPC Sections</th>
                          <th style="min-width: 120px;">Charges Framed</th>
                          <th style="min-width: 120px;">Date Framed</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${validCases.map(caseItem => `
                          <tr>
                            <td>${caseItem.serialNo}</td>
                            <td>${caseItem.firNo || 'N/A'}</td>
                            <td style="font-weight: 600;">${caseItem.caseNo || 'N/A'}</td>
                            <td>${caseItem.court || 'N/A'}</td>
                            <td style="color: #dc2626; font-weight: 600;">${caseItem.ipcSections || 'N/A'}</td>
                            <td style="text-align: center;">
                              ${caseItem.chargesFramed === 'Yes' ?
            '<span style="color: #dc2626; font-weight: 700;">✓ Yes</span>' :
            '<span style="color: #6b7280;">✗ No</span>'}
                            </td>
                            <td>${caseItem.dateChargesFramed || '-'}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            `;
      }
    }

    if (candidateData.movableAssets && candidateData.movableAssets.length > 0) {
      detailsHTML += `
            <div style="margin-top: 25px;">
              <div class="section-header">
                <div class="chart-title"><span class="chart-title-icon">🚗</span>Movable Assets</div>
                <button class="toggle-btn" onclick="toggleSection('movable-content')">Show Details</button>
              </div>
              <div id="movable-content" class="collapsible-content">
          `;

      candidateData.movableAssets.forEach(asset => {
        const owners = [];
        if (asset.self && asset.self !== 'Nil') owners.push({ label: 'Self', value: asset.self, color: '#3b82f6' });
        if (asset.spouse && asset.spouse !== 'Nil') owners.push({ label: 'Spouse', value: asset.spouse, color: '#8b5cf6' });
        if (asset.dependent1 && asset.dependent1 !== 'Nil') owners.push({ label: 'Dependent 1', value: asset.dependent1, color: '#ec4899' });
        if (asset.dependent2 && asset.dependent2 !== 'Nil') owners.push({ label: 'Dependent 2', value: asset.dependent2, color: '#f59e0b' });
        if (asset.dependent3 && asset.dependent3 !== 'Nil') owners.push({ label: 'Dependent 3', value: asset.dependent3, color: '#10b981' });

        if (owners.length > 0 && asset.description) {
          const gridCols = owners.length === 1 ? '1fr' : owners.length === 2 ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))';

          detailsHTML += `
                <div style="margin-bottom: 25px; background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); padding: 24px; border-radius: 18px; border: 2px solid #fb923c; box-shadow: 0 4px 12px rgba(251, 146, 60, 0.15);">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
                    <div style="flex: 1; min-width: 200px;">
                      <div style="font-size: 0.85em; color: #9a3412; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">${asset.srNo}</div>
                      <h4 style="font-size: 1.15em; font-weight: 700; color: #7c2d12; line-height: 1.4;">${asset.description}</h4>
                    </div>
                    <div style="background: white; padding: 10px 20px; border-radius: 12px; font-size: 1.3em; font-weight: 800; color: #7c2d12; box-shadow: 0 2px 8px rgba(0,0,0,0.08); white-space: nowrap;">
                      ${formatCurrency(asset.total) || 'Nil'}
                    </div>
                  </div>
                  <div style="display: grid; grid-template-columns: ${gridCols}; gap: 14px;">
              `;

          owners.forEach(owner => {
            detailsHTML += `
                  <div style="background: white; padding: 14px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid ${owner.color}; transition: transform 0.2s ease;">
                    <div style="font-size: 0.8em; color: #6b7280; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${owner.label}</div>
                    <div style="font-size: 1em; font-weight: 700; color: #1e293b; word-break: break-word; line-height: 1.3;">${formatCurrency(owner.value)}</div>
                  </div>
                `;
          });

          detailsHTML += `
                  </div>
                </div>
              `;
        }
      });

      detailsHTML += `
              </div>
            </div>
          `;
    }

    if (candidateData.immovableAssets && candidateData.immovableAssets.length > 0) {
      detailsHTML += `
            <div style="margin-top: 25px;">
              <div class="section-header">
                <div class="chart-title"><span class="chart-title-icon">🏠</span>Immovable Assets (Property)</div>
                <button class="toggle-btn" onclick="toggleSection('immovable-content')">Show Details</button>
              </div>
              <div id="immovable-content" class="collapsible-content">
          `;

      candidateData.immovableAssets.forEach(asset => {
        const owners = [];
        if (asset.self && asset.self !== 'Nil') owners.push({ label: 'Self', value: asset.self, color: '#3b82f6' });
        if (asset.spouse && asset.spouse !== 'Nil') owners.push({ label: 'Spouse', value: asset.spouse, color: '#8b5cf6' });
        if (asset.dependent1 && asset.dependent1 !== 'Nil') owners.push({ label: 'Dependent 1', value: asset.dependent1, color: '#ec4899' });
        if (asset.dependent2 && asset.dependent2 !== 'Nil') owners.push({ label: 'Dependent 2', value: asset.dependent2, color: '#f59e0b' });
        if (asset.dependent3 && asset.dependent3 !== 'Nil') owners.push({ label: 'Dependent 3', value: asset.dependent3, color: '#10b981' });

        if (owners.length > 0 && asset.description) {
          const gridCols = owners.length === 1 ? '1fr' : owners.length === 2 ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))';

          let cleanDescription = asset.description
            .replace(/Total Area[^]*?(?=Whether|$)/g, '')
            .replace(/Built Up Area[^]*?(?=Whether|$)/g, '')
            .replace(/Whether Inherited[^]*?(?=Purchase|$)/g, '')
            .replace(/Purchase Date[^]*?(?=Purchase|$)/g, '')
            .replace(/Purchase Cost[^]*?(?=Development|$)/g, '')
            .replace(/Development Cost[^]*?(?=\d|\n|$)/g, '')
            .replace(/\n\s*\n/g, '\n')
            .replace(/^\s+|\s+$/g, '')
            .trim();

          detailsHTML += `
                <div style="margin-bottom: 25px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 24px; border-radius: 18px; border: 2px solid #60a5fa; box-shadow: 0 4px 12px rgba(96, 165, 250, 0.15);">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
                    <div style="flex: 1; min-width: 250px;">
                      <div style="font-size: 0.85em; color: #1e40af; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">${asset.srNo}</div>
                      <h4 style="font-size: 1.15em; font-weight: 700; color: #1e3a8a; line-height: 1.4; margin-bottom: 10px;">${asset.description.split('\n')[0]}</h4>
                      ${cleanDescription ? `<div style="font-size: 0.9em; color: #475569; line-height: 1.6; background: white; padding: 12px; border-radius: 10px; white-space: pre-line; border-left: 3px solid #60a5fa;">${cleanDescription}</div>` : ''}
                    </div>
                    <div style="background: white; padding: 10px 20px; border-radius: 12px; font-size: 1.3em; font-weight: 800; color: #1e3a8a; box-shadow: 0 2px 8px rgba(0,0,0,0.08); white-space: nowrap;">
                      ${formatCurrency(asset.total) || 'Nil'}
                    </div>
                  </div>
                  <div style="display: grid; grid-template-columns: ${gridCols}; gap: 14px;">
              `;

          owners.forEach(owner => {
            detailsHTML += `
                  <div style="background: white; padding: 14px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid ${owner.color}; transition: transform 0.2s ease;">
                    <div style="font-size: 0.8em; color: #6b7280; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${owner.label}</div>
                    <div style="font-size: 1em; font-weight: 700; color: #1e293b; word-break: break-word; line-height: 1.3;">${formatCurrency(owner.value)}</div>
                  </div>
                `;
          });

          detailsHTML += `
                  </div>
                </div>
              `;
        }
      });

      detailsHTML += `
              </div>
            </div>
          `;
    }

    if (candidateData.liabilities && candidateData.liabilities.length > 0) {
      const validLiabilities = candidateData.liabilities.filter(liability => {
        const hasData = liability.self !== 'Nil' || liability.spouse !== 'Nil' ||
          liability.dependent1 !== 'Nil' || liability.dependent2 !== 'Nil' ||
          liability.dependent3 !== 'Nil';
        return hasData && liability.description && !liability.description.includes('Grand Total');
      });

      if (validLiabilities.length > 0) {
        detailsHTML += `
              <div style="margin-top: 25px;">
                <div class="section-header">
                  <div class="chart-title"><span class="chart-title-icon">💳</span>Liabilities</div>
                  <button class="toggle-btn" onclick="toggleSection('liabilities-content')">Show Details</button>
                </div>
                <div id="liabilities-content" class="collapsible-content">
            `;

        validLiabilities.forEach(liability => {
          const owners = [];
          if (liability.self && liability.self !== 'Nil') owners.push({ label: 'Self', value: liability.self, color: '#ef4444' });
          if (liability.spouse && liability.spouse !== 'Nil') owners.push({ label: 'Spouse', value: liability.spouse, color: '#dc2626' });
          if (liability.dependent1 && liability.dependent1 !== 'Nil') owners.push({ label: 'Dependent 1', value: liability.dependent1, color: '#f87171' });
          if (liability.dependent2 && liability.dependent2 !== 'Nil') owners.push({ label: 'Dependent 2', value: liability.dependent2, color: '#fb923c' });
          if (liability.dependent3 && liability.dependent3 !== 'Nil') owners.push({ label: 'Dependent 3', value: liability.dependent3, color: '#fbbf24' });

          if (owners.length > 0) {
            const gridCols = owners.length === 1 ? '1fr' : owners.length === 2 ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(160px, 1fr))';

            detailsHTML += `
                  <div style="margin-bottom: 25px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); padding: 24px; border-radius: 18px; border: 2px solid #f87171; box-shadow: 0 4px 12px rgba(248, 113, 113, 0.15);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
                      <div style="flex: 1; min-width: 200px;">
                        <div style="font-size: 0.85em; color: #991b1b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">${liability.srNo ? liability.srNo : 'Liability'}</div>
                        <h4 style="font-size: 1.15em; font-weight: 700; color: #7f1d1d; line-height: 1.4;">${liability.description}</h4>
                      </div>
                      <div style="background: white; padding: 10px 20px; border-radius: 12px; font-size: 1.3em; font-weight: 800; color: #7f1d1d; box-shadow: 0 2px 8px rgba(0,0,0,0.08); white-space: nowrap;">
                        ${formatCurrency(liability.total) || 'Nil'}
                      </div>
                    </div>
                    <div style="display: grid; grid-template-columns: ${gridCols}; gap: 14px;">
                `;

            owners.forEach(owner => {
              detailsHTML += `
                    <div style="background: white; padding: 14px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border-left: 4px solid ${owner.color}; transition: transform 0.2s ease;">
                      <div style="font-size: 0.8em; color: #6b7280; font-weight: 700; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">${owner.label}</div>
                      <div style="font-size: 1em; font-weight: 700; color: #1e293b; word-break: break-word; line-height: 1.3;">${formatCurrency(owner.value)}</div>
                    </div>
                  `;
            });

            detailsHTML += `
                    </div>
                  </div>
                `;
          }
        });

        detailsHTML += `
                </div>
              </div>
            `;
      }
    }

    detailsHTML += '</div>';
  }

  const infoItems = [];
  if (data.state !== 'N/A') {
    infoItems.push(`
          <div class="info-item">
            <div class="info-label">📍 State</div>
            <div class="info-value">${data.state}</div>
          </div>
        `);
  }
  if (data.age !== 'N/A') {
    infoItems.push(`
          <div class="info-item">
            <div class="info-label">🎂 Age</div>
            <div class="info-value">${data.age} years</div>
          </div>
        `);
  }
  if (data.education !== 'N/A') {
    infoItems.push(`
          <div class="info-item">
            <div class="info-label">🎓 Education</div>
            <div class="info-value">${data.education}</div>
          </div>
        `);
  }
  if (data.gender !== 'N/A') {
    infoItems.push(`
          <div class="info-item">
            <div class="info-label">👤 Gender</div>
            <div class="info-value">${data.gender}</div>
          </div>
        `);
  }
  if (data.termStart !== 'N/A') {
    infoItems.push(`
          <div class="info-item">
            <div class="info-label">📅 Term Start</div>
            <div class="info-value">${data.termStart}</div>
          </div>
        `);
  }
  if (data.termEnd !== 'N/A') {
    infoItems.push(`
          <div class="info-item">
            <div class="info-label">📅 Term End</div>
            <div class="info-value">${data.termEnd}</div>
          </div>
        `);
  }
  if (data.noOfTerm && data.noOfTerm !== 'N/A') {
    infoItems.push(`
          <div class="info-item">
            <div class="info-label">🔄 Terms Served</div>
            <div class="info-value">${data.noOfTerm}</div>
          </div>
        `);
  }

  const quickStats = [];
  if (candidateData) {
    const crimeCases = candidateData.crimeOMeter?.cases || 0;
    quickStats.push(`
          <div class="quick-stat-item">
            <span class="quick-stat-icon">${crimeCases === 0 ? '✓' : '⚠️'}</span>
            <div class="quick-stat-text">
              <span class="quick-stat-label">Criminal Cases</span>
              <span class="quick-stat-value">${crimeCases}</span>
            </div>
          </div>
        `);


    if (candidateData.candidate?.relation) {
      quickStats.push(`
            <div class="quick-stat-item">
              <span class="quick-stat-icon">👨‍👩‍👦</span>
              <div class="quick-stat-text">
                <span class="quick-stat-label">Relation</span>
                <span class="quick-stat-value">${candidateData.candidate.relation}</span>
              </div>
            </div>
          `);
    }
  }

  const profileHighlights = [];

  if (candidateData) {
    if (candidateData.candidate?.voterEnrollment) {
      const voterInfo = candidateData.candidate.voterEnrollment;
      const constituencyMatch = voterInfo.match(/\d+-([^,]+)/);
      if (constituencyMatch) {
        profileHighlights.push({
          icon: '🗳️',
          label: 'Voter From',
          value: constituencyMatch[1].trim()
        });
      }
    }

    if (candidateData.profession?.self && candidateData.profession.self !== 'N/A') {
      profileHighlights.push({
        icon: '💼',
        label: 'Profession',
        value: candidateData.profession.self
      });
    }

    if (candidateData.sourcesOfIncome?.self) {
      profileHighlights.push({
        icon: '💵',
        label: 'Income Source',
        value: candidateData.sourcesOfIncome.self
      });
    }
  }

  document.getElementById('content').innerHTML = `
        <div class="header-card">
          <div class="header-content">
            <div class="profile-section">
              <div class="profile-image-wrapper">
                <img src="${data.imageUrl || 'https://via.placeholder.com/200'}" alt="${data.name}" class="profile-image" onerror="this.src='https://via.placeholder.com/200'">
                <div class="verification-badge" title="Verified Profile">✓</div>
              </div>
              <div class="profile-info">
                <h1 class="member-name">${data.name}</h1>
                <div class="member-role-section">
                  <span class="role-badge">
                    <span style="font-size: 1.3em;">🏛️</span>
                    <strong>${data.type}</strong>
                  </span>
                  <span class="constituency-badge">
                    <span style="font-size: 1.2em;">📍</span>
                    ${data.constituency}
                  </span>
                  ${data.party !== 'N/A' ? `
                    <span class="party-badge">
                      <span style="font-size: 1.1em;">🎯</span>
                      ${data.party}
                    </span>
                  ` : ''}
                </div>
                
                ${quickStats.length > 0 ? `<div class="quick-stats">${quickStats.join('')}</div>` : ''}
                
                ${profileHighlights.length > 0 ? `
                  <div class="profile-highlights">
                    ${profileHighlights.map(h => `
                      <div class="highlight-card">
                        <span class="highlight-icon">${h.icon}</span>
                        <div class="highlight-label">${h.label}</div>
                        <div class="highlight-value">${h.value}</div>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
                
                ${infoItems.length > 0 ? `<div class="info-grid">${infoItems.join('')}</div>` : ''}
              </div>
            </div>
          </div>
        </div>

        ${statsHTML || `
          <div class="details-section">
            <div class="no-data-placeholder">
              <div class="icon">📊</div>
              <div style="font-size: 1.3em; color: #475569; font-weight: 600; margin-bottom: 10px;">
                ${data.type === 'MLA' ? 'Performance Metrics Not Available' : 'Performance Data Not Available'}
              </div>
              <div style="font-size: 1em; max-width: 500px; margin: 0 auto;">
                ${data.type === 'MLA' ? 'Detailed performance metrics are typically available for MPs. MLA profiles show basic information and affidavit data.' : 'Performance data is not available for this member at the moment.'}
              </div>
            </div>
          </div>
        `}

        ${detailsHTML}
      `;
}

async function loadMemberDataWithLoader() {
  const loader = document.getElementById("loading-screen");
  loader.style.display = "flex";
  await loadMemberData();
  loader.style.display = "none";
}


window.addEventListener("DOMContentLoaded", loadMemberDataWithLoader);

// Test function to simulate WebSocket update for testing purposes
window.testWebSocketUpdate = function() {
  const testData = {
    updatedData: {
      attendanceTable: '<table><thead><tr><th>Test Attendance Header</th></tr></thead><tbody><tr><td>Test Attendance Data</td></tr></tbody></table>',
      debatesTable: '<table><thead><tr><th>Test Debates Header</th></tr></thead><tbody><tr><td>Test Debates Data</td></tr></tbody></table>',
      questionsTable: '<table><thead><tr><th>Test Questions Header</th></tr></thead><tbody><tr><td>Test Questions Data</td></tr></tbody></table>'
    }
  };

  console.log("Simulating WebSocket update:", testData.updatedData);

  // Directly update the DOM with the new table HTML
  if (testData.updatedData.attendanceTable) {
    const attendanceDiv = document.getElementById('attendance-content');
    if (attendanceDiv) {
      attendanceDiv.innerHTML = testData.updatedData.attendanceTable;
      console.log("Updated attendance-content innerHTML");
    }
  }
  if (testData.updatedData.debatesTable) {
    const debatesDiv = document.getElementById('debates-content');
    if (debatesDiv) {
      debatesDiv.innerHTML = testData.updatedData.debatesTable;
      console.log("Updated debates-content innerHTML");
    }
  }
  if (testData.updatedData.questionsTable) {
    const questionsDiv = document.getElementById('questions-content');
    if (questionsDiv) {
      questionsDiv.innerHTML = testData.updatedData.questionsTable;
      console.log("Updated questions-content innerHTML");
    }
  }
};

const style = document.createElement("style");
style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
document.head.appendChild(style);
