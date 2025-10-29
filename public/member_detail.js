
    function createParticles() {
      const particlesContainer = document.getElementById('particles');
      if (!particlesContainer) return;
      
      const particleCount = 30;
      
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 60 + 20;
        const startX = Math.random() * window.innerWidth;
        const duration = Math.random() * 20 + 15;
        const delay = Math.random() * 5;
        
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.left = startX + 'px';
        particle.style.animationDuration = duration + 's';
        particle.style.animationDelay = delay + 's';
        
        particlesContainer.appendChild(particle);
      }
    }

    // Scroll reveal animation
    function revealOnScroll() {
      const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
      
      reveals.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
          element.classList.add('active');
        }
      });
    }

    // Add sparkles to quick stat items
    function addSparkles() {
      const statItems = document.querySelectorAll('.quick-stat-item');
      
      statItems.forEach(item => {
        item.addEventListener('mouseenter', function(e) {
          for (let i = 0; i < 6; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            
            const tx = (Math.random() - 0.5) * 100;
            const ty = (Math.random() - 0.5) * 100;
            
            sparkle.style.setProperty('--tx', tx + 'px');
            sparkle.style.setProperty('--ty', ty + 'px');
            sparkle.style.left = Math.random() * 100 + '%';
            sparkle.style.top = Math.random() * 100 + '%';
            sparkle.style.animationDelay = (Math.random() * 0.5) + 's';
            
            this.appendChild(sparkle);
            
            setTimeout(() => sparkle.remove(), 1000);
          }
        });
      });
    }

    // Animate counters
    function animateCounters() {
      const counters = document.querySelectorAll('.quick-stat-value');
      
      counters.forEach(counter => {
        const text = counter.textContent;
        const match = text.match(/[\d.]+/);
        
        if (match) {
          const endValue = parseFloat(match[0]);
          const duration = 2000;
          const startTime = Date.now();
          
          function updateCounter() {
            const currentTime = Date.now();
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentValue = (endValue * easeProgress).toFixed(text.includes('.') ? 2 : 0);
            
            counter.textContent = text.replace(/[\d.]+/, currentValue);
            
            if (progress < 1) {
              requestAnimationFrame(updateCounter);
            }
          }
          
          counter.textContent = text.replace(/[\d.]+/, '0');
          counter.classList.add('counting');
          
          setTimeout(() => {
            updateCounter();
          }, 500);
        }
      });
    }

    // 3D tilt effect for cards
    function add3DTilt() {
      const cards = document.querySelectorAll('.quick-stat-item, .card-item');
      
      cards.forEach(card => {
        card.addEventListener('mousemove', function(e) {
          const rect = this.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          
          const rotateX = (y - centerY) / 10;
          const rotateY = (centerX - x) / 10;
          
          this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
        });
        
        card.addEventListener('mouseleave', function() {
          this.style.transform = '';
        });
      });
    }

    const loadingMessages = [
      { text: "Connecting to Database...", subtitle: "Establishing secure connection", icon: "🔌", step: 1, progress: 10 },
      { text: "Fetching Member Profile...", subtitle: "Retrieving parliamentary data", icon: "📊", step: 1, progress: 20 },
      { text: "Extracting Personal Information...", subtitle: "Processing member details", icon: "👤", step: 1, progress: 30 },
      { text: "Analyzing Financial Data...", subtitle: "Scanning affidavit records", icon: "💰", step: 2, progress: 40 },
      { text: "Finding Bank Accounts...", subtitle: "Extracting deposit information", icon: "🏦", step: 2, progress: 50 },
      { text: "Parsing Asset Details...", subtitle: "Processing movable assets", icon: "💎", step: 3, progress: 60 },
      { text: "Identifying Vehicles...", subtitle: "Extracting vehicle information", icon: "🚗", step: 3, progress: 70 },
      { text: "Processing Properties...", subtitle: "Analyzing immovable assets", icon: "🏠", step: 4, progress: 80 },
      { text: "Calculating Liabilities...", subtitle: "Processing loan details", icon: "💳", step: 4, progress: 90 },
      { text: "Finalizing Dashboard...", subtitle: "Preparing visualization", icon: "✨", step: 5, progress: 95 },
      { text: "Almost Ready...", subtitle: "Final touches", icon: "🎨", step: 5, progress: 100 }
    ];

    let currentMessageIndex = 0;
    let messageInterval;

    function updateLoadingMessage() {
      if (currentMessageIndex >= loadingMessages.length) {
        clearInterval(messageInterval);
        return;
      }

      const message = loadingMessages[currentMessageIndex];
      const loadingText = document.getElementById('loading-text');
      const loadingSubtitle = document.getElementById('loading-subtitle');
      const loaderIcon = document.getElementById('loader-icon');
      const progressBar = document.getElementById('progress-bar');

      loadingText.style.animation = 'none';
      loadingSubtitle.style.animation = 'none';
      
      setTimeout(() => {
        loadingText.textContent = message.text;
        loadingSubtitle.textContent = message.subtitle;
        loaderIcon.textContent = message.icon;
        progressBar.style.width = message.progress + '%';
        
        loadingText.style.animation = 'fadeIn 0.5s ease-in-out';
        loadingSubtitle.style.animation = 'fadeIn 0.5s ease-in-out';

        for (let i = 1; i <= 5; i++) {
          const step = document.getElementById(`step-${i}`);
          if (i < message.step) {
            step.className = 'loading-step completed';
          } else if (i === message.step) {
            step.className = 'loading-step active';
          } else {
            step.className = 'loading-step';
          }
        }
      }, 10);

      currentMessageIndex++;
    }

    function startLoadingAnimation() {
      updateLoadingMessage();
      messageInterval = setInterval(updateLoadingMessage, 800);
    }

    function scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function shareProfile() {
      if (navigator.share) {
        navigator.share({
          title: `${currentMemberName} - ${currentMemberType} Profile`,
          text: `Check out the profile of ${currentMemberName}`,
          url: window.location.href
        }).catch(err => console.log('Share failed:', err));
      } else {
        navigator.clipboard.writeText(window.location.href).then(() => {
          alert('✅ Profile link copied to clipboard!');
        });
      }
    }

    window.addEventListener('scroll', () => {
      const backToTop = document.getElementById('backToTop');
      if (window.scrollY > 300) {
        backToTop.style.display = 'flex';
      } else {
        backToTop.style.display = 'none';
      }
      
      revealOnScroll();
    });

    window.scrollToTop = scrollToTop;
    window.shareProfile = shareProfile;

    let currentMemberData = null;
    let currentCandidateData = null;
    let currentMemberName = null;
    let currentMemberType = null;

    function getQueryParams() {
      const params = {};
      window.location.search.substring(1).split('&').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key) params[key] = decodeURIComponent(value || '');
      });
      return params;
    }

    const escapeHtml = (text) => {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text.replace(/\+/g, ' ');
      return div.innerHTML;
    };
    
    const safeText = (value) => {
      if (!value) return 'N/A';
      return escapeHtml(String(value));
    };

    function formatCurrency(value) {
      if (!value || value === 'Nil' || value === 'N/A') return 'N/A';
      
      const match = String(value).match(/Rs\s*([\d,]+)/);
      if (match) {
        const num = parseInt(match[1].replace(/,/g, ''));
        if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
        if (num >= 100000) return `₹${(num / 100000).toFixed(2)} L`;
        if (num >= 1000) return `₹${(num / 1000).toFixed(2)} K`;
        return `₹${num.toLocaleString('en-IN')}`;
      }
      return value;
    }

    function toggleSection(id) {
      const content = document.getElementById(id);
      const btn = event.target;
      if (content) {
        content.classList.toggle('active');
        btn.textContent = content.classList.contains('active') ? 'Hide Details' : 'Show Details';
      }
    }

    window.toggleSection = toggleSection;

    function cleanAttendance(value) {
      if (!value || value === 'N/A' || value === 'NANA' || value === 'nananan' || value === 'NANAN' || value === 'NaN' || value === 'null' || value === 'undefined') return 'N/A';

      const cleaned = String(value).replace(/%/g, '').trim();

      // Check for invalid values after cleaning
      if (cleaned === 'NANA' || cleaned === 'nananan' || cleaned === 'NANAN' || cleaned === 'NaN' || cleaned === 'null' || cleaned === 'undefined' || cleaned === '') return 'N/A';

      // If it's a valid number, add % back
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        return num + '%';
      }

      return 'N/A';
    }
function cleanEducation(educationText) {
  if (!educationText) return 'N/A';
  
  // First, remove all the Google Charts and JavaScript code
  let cleaned = educationText
    // Remove everything from google.charts to the end of the function
    .replace(/google\.charts[\s\S]*?}\s*\)/gm, '')
    // Remove script tags and their content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // Remove function definitions
    .replace(/function\s+\w+\s*\([^)]*\)\s*{[\s\S]*?}/g, '')
    // Remove Crime-O-Meter section
    .replace(/Crime-O-Meter[\s\S]*?Criminal Cases:\s*\d+/gi, '')
    // Remove Assets & Liabilities section
    .replace(/Assets\s*&\s*Liabilities[\s\S]*?Liabilities:\s*Rs\s*[\d,]+\s*~[\s\S]*?Lacs\+/gi, '')
    // Remove chart related content
    .replace(/var\s+(data|options|chart)[\s\S]*?;/g, '')
    .replace(/chart\.draw\([^)]*\);?/g, '')
    // Remove any remaining JavaScript snippets
    .replace(/\(['"].*?['"]\)/g, '')
    .replace(/document\.getElementById\([^)]*\)/g, '')
    // Remove numeric patterns that look like amounts
    .replace(/\d{1,3}(,\d{3})*\s*~\d+\s*Lacs?\+/g, '')
    // Clean up "Others" prefix at the beginning
    .replace(/^\s*Others\s+/i, '')
    // Remove duplicate content (the text appears twice in your sample)
    .replace(/(\n|^)Others\s+/gi, '\n')
    // Clean up back(drawChart) and similar artifacts
    .replace(/back\(drawChart\);?/gi, '')
    // Remove any remaining gauge/chart references
    .replace(/google\.visualization\.\w+/g, '')
    .replace(/\bGauge\b/g, '')
    .replace(/chart_div/g, '')
    // Remove Nu | mber patterns
    .replace(/Num\s*\|\s*ber/gi, 'Number')
    // Clean up pipe separators that shouldn't be there
    .replace(/([a-zA-Z])\s*\|\s*([a-zA-Z])/g, '$1$2')
    // Remove multiple spaces and trim
    .replace(/\s+/g, ' ')
    .trim();
  
  // Now extract the actual education content
  // Look for education-related keywords
  const educationPatterns = [
    /Diploma[\s\S]*?Year-?\d{4}/gi,
    /Doctorate[\s\S]*?(?=\s*$|Others|Crime)/gi,
    /Ph\.?D[\s\S]*?(?=\s*$|Others|Crime)/gi,
    /Post\s*Graduate[\s\S]*?(?=\s*$|Others|Crime)/gi,
    /Graduate[\s\S]*?(?=\s*$|Others|Crime)/gi,
    /M\.?A[\s\S]*?(?=\s*$|Others|Crime)/gi,
    /M\.?Sc[\s\S]*?(?=\s*$|Others|Crime)/gi,
    /M\.?Com[\s\S]*?(?=\s*$|Others|Crime)/gi,
    /M\.?B\.?A[\s\S]*?(?=\s*$|Others|Crime)/gi,
    /B\.?E[\s\S]*?(?=\s*$|Others|Crime)/gi,
    /B\.?Tech[\s\S]*?(?=\s*$|Others|Crime)/gi,
    /B\.?A[\s\S]*?(?=\s*$|Others|Crime)/gi,
    /B\.?Sc[\s\S]*?(?=\s*$|Others|Crime)/gi,
    /B\.?Com[\s\S]*?(?=\s*$|Others|Crime)/gi,
    /\d{1,2}th\s+Pass[\s\S]*?Year-?\d{4}/gi,
    /\d{1,2}th\s+[Ss]tandard[\s\S]*?Year-?\d{4}/gi
  ];
  
  const educationMatches = [];
  
  for (const pattern of educationPatterns) {
    const matches = cleaned.match(pattern);
    if (matches) {
      matches.forEach(match => {
      
        const cleanMatch = match
          .replace(/\s+/g, ' ')
          .replace(/Others\s*/gi, '')
          .trim();
        
        if (cleanMatch.length > 10 && !educationMatches.some(em => em.includes(cleanMatch) || cleanMatch.includes(em))) {
          educationMatches.push(cleanMatch);
        }
      });
    }
  }
  
  if (educationMatches.length > 0) {
   
    return educationMatches.join(' & ');
  }
 
  const fallbackPatterns = [
    'diploma', 'degree', 'engineering', 'medical', 'arts', 'science', 'commerce',
    'university', 'college', 'institute', 'school', 'pass', 'graduate', 'master',
    'bachelor', 'phd', 'doctorate', 'certificate'
  ];
  
  const hasEducationKeywords = fallbackPatterns.some(keyword => 
    cleaned.toLowerCase().includes(keyword)
  );
  
  if (hasEducationKeywords && cleaned.length > 10 && cleaned.length < 500) {
  
    return cleaned
      .replace(/^\W+/, '') 
      .replace(/\W+$/, '') 
      .replace(/\s{2,}/g, ' ') 
      .trim();
  }
  
  return 'N/A';
}
function parseBankAccounts(text) {
      if (!text || text === 'Nil') return [];

      const accounts = [];
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 10);

      for (const line of lines) {
        const isFD = /^FD\s+[Ii]n/i.test(line);
        
        const bankMatch = line.match(/\b(State Bank of India|SBI|ICICI Bank|ICICI|HDFC Bank|HDFC|Axis Bank|Axis|Canara Bank|Canara|Punjab National Bank|PNB|Bank of Baroda|BOB|Union Bank|Oriental Bank of Commerce|OBC|IDBI Bank|Indian Bank|Yes Bank|Kotak Mahindra Bank|Federal Bank|IndusInd Bank)\b/i);
        const bank = bankMatch ? bankMatch[1].trim() : '';
        
        const branchMatch = line.match(/Br\.?\s+([^,]+?)(?:,|\s+No)/i);
        const branch = branchMatch ? branchMatch[1].trim() : 'N/A';
        
        const accMatch = line.match(/No\s+([\dxX]+)/);
        const accountNo = accMatch ? accMatch[1] : '';
        
        const amountMatch = line.match(/Rs\s+([\d,]+)/);
        const amount = amountMatch ? `Rs ${amountMatch[1]}` : 'N/A';
        
        if (!bank || !accountNo) continue;
        
        accounts.push({ bank, branch, accountNo, amount, type: isFD ? 'Fixed Deposit' : 'Savings/Current' });
      }

      console.log(`🏦 Parsed ${accounts.length} bank accounts`);
      return accounts;
    }

    function parseVehicles(text) {
      if (!text || text === 'Nil') return [];

      const vehicles = [];
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 15);

      const brands = ['Audi', 'BMW', 'Mercedes', 'Toyota', 'Honda', 'Hyundai', 'Mahindra', 'Maruti', 'Innova', 'Fortuner', 'City'];

      for (const line of lines) {
        let make = 'Vehicle';
        for (const brand of brands) {
          if (new RegExp(`\\b${brand}\\b`, 'i').test(line)) {
            make = brand;
            break;
          }
        }
        
        const modelMatch = line.match(/Model[:\s]+([^,]+?)(?:,|Reg|\s+Rs)/i);
        const model = modelMatch ? modelMatch[1].trim() : '';
        
        const regMatch = line.match(/[Rr]eg(?:istration)?\s*No[:\s-]*([A-Z0-9-]+)/i);
        const registration = regMatch ? regMatch[1].trim() : '';
        
        const yearMatch = line.match(/(?:Date\s*Of\s*Purchased|DOP|Purchased)[:\s]*(\d{2,4}[-\/]\d{2}[-\/]\d{2,4}|\d{4})/i) || line.match(/\b(20\d{2}|19\d{2})\b/);
        const year = yearMatch ? yearMatch[1] : '';
        
        const amountMatch = line.match(/Rs\s+([\d,]+)/);
        const amount = amountMatch ? `Rs ${amountMatch[1]}` : 'N/A';
        
        vehicles.push({ make, model, registration, year, amount });
      }

      console.log(`🚗 Parsed ${vehicles.length} vehicles`);
      return vehicles;
    }
function parseProperty(text) {
  if (!text || text === 'Nil') return [];
  
  const properties = [];
  
  // Split by double newlines or numbered patterns like (1), (2)
  const blocks = text.split(/\n\n+|(?=\(\d+\)-)/g).filter(b => b.trim().length > 0);
  
  for (const block of blocks) {
    let address = '';
    let value = 'N/A';
    let area = '';
    
    // Extract value
    const valueMatch = block.match(/Value:\s*Rs\s*([\d,]+)/i);
    if (valueMatch) {
      value = `Rs ${valueMatch[1]}`;
      // Get address part (everything before "| Value:")
      address = block.split('|')[0].trim().replace(/^\(\d+\)-/, '').trim();
    } else {
      address = block.trim();
    }
    
    // Extract area/rakba
    const areaMatch = block.match(/(?:Area|Rakba)[:\s-]*([\d.]+\s*(?:hec|sq|acres|sq\.?\s*(?:ft|m|meter)?))/i);
    if (areaMatch) {
      area = areaMatch[1].trim();
    }
    
    if (address && address.length > 5 && address !== 'Nil') {
      properties.push({ address, value, area });
    }
  }
  
  console.log(`🏠 Parsed ${properties.length} properties from text`);
  return properties;
}
    function parseLoans(text) {
      if (!text || text === 'Nil') return [];
      
      const loans = [];
      const lines = text.split('\n').filter(l => l.trim().length > 10);
      
      for (const line of lines) {
        const parts = line.split(':');
        if (parts.length < 2) continue;
        
        const lender = parts[0].trim();
        
        let type = 'Loan';
        if (/House Loan/i.test(line)) type = 'House Loan';
        else if (/Unsecured Loan/i.test(line)) type = 'Unsecured Loan';
        else if (/Personal Loan/i.test(line)) type = 'Personal Loan';
        
        const accMatch = line.match(/Ac\s+No[:\s-]*([\w-]+)/i);
        const accountNo = accMatch ? accMatch[1] : '';
        
        const amountMatch = line.match(/Rs\s+([\d,]+)/);
        const amount = amountMatch ? `Rs ${amountMatch[1]}` : 'N/A';
        
        loans.push({ lender, type, accountNo, amount });
      }
      
      console.log(`💳 Parsed ${loans.length} loans`);
      return loans;
    }

    function parseSimpleList(text) {
      if (!text || text === 'Nil') return [];
      
      const items = [];
      const lines = text.split('\n').filter(l => l.trim().length > 5);
      
      for (const line of lines) {
        const parts = line.split(':');
        const description = parts[0] ? parts[0].trim() : line.trim();
        
        const amountMatch = line.match(/Rs\s+([\d,]+)/);
        const amount = amountMatch ? `Rs ${amountMatch[1]}` : 'N/A';
        
        items.push({ description, amount });
      }
      
      return items;
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
        <div class="stat-card reveal">
          <div class="stat-header">
            <div class="stat-title">${escapeHtml(title)}</div>
            <div class="stat-icon" style="background: ${gradient};">${icon}</div>
          </div>
          <div class="stat-value">${escapeHtml(mpValue) || 'N/A'}</div>
          <div class="comparison-bars">
            <div class="comparison-bar">
              <span class="bar-label">Selected</span>
              <div class="bar-container">
                <div class="bar-fill" style="width: ${mpPct}%; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
              </div>
              <span class="bar-value">${escapeHtml(mpValue) || 'N/A'}</span>
            </div>
            ${natAvg && natAvg !== 'N/A' ? `
            <div class="comparison-bar">
              <span class="bar-label">National Avg</span>
              <div class="bar-container">
                <div class="bar-fill" style="width: ${natPct}%; background: linear-gradient(90deg, #10b981, #059669);"></div>
              </div>
              <span class="bar-value">${escapeHtml(natAvg)}</span>
            </div>
            ` : ''}
            ${stateAvg && stateAvg !== 'N/A' ? `
            <div class="comparison-bar">
              <span class="bar-label">State Avg</span>
              <div class="bar-container">
                <div class="bar-fill" style="width: ${statePct}%; background: linear-gradient(90deg, #f59e0b, #d97706);"></div>
              </div>
              <span class="bar-value">${escapeHtml(stateAvg)}</span>
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }

   // ============================================================================
// PROGRESSIVE LOADING STATE
// ============================================================================
let currentRequestId = null;
let pollingInterval = null;
let pollingAttempts = 0;
const MAX_POLL_ATTEMPTS = 15; // 30 seconds max
const POLL_INTERVAL = 2000; // 2 seconds

// ============================================================================
// MAIN DATA LOADER - WITH PARALLEL FETCHING
// ============================================================================
async function loadMemberData() {
  if (window.SERVER_DATA) {
    console.log('✅ Using server-injected data');
    const { memberName, memberType, prsData, candidateData } = window.SERVER_DATA;
    
    currentMemberName = memberName;
    currentMemberType = memberType;
    currentCandidateData = candidateData;

    if (memberType === 'MP') {
      renderMPDashboardFromServerData(prsData, candidateData);
    } else {
      renderMLADashboardFromServerData(prsData, candidateData);
    }
    
    return;
  }

  console.log('⚠️ No server data, fetching via API...');
  const params = getQueryParams();
  const { name, type, meow, bhaw, constituency, party } = params;
  
  if (!name || !type) {
    throw new Error('Missing name or type parameter');
  }
  
  currentMemberName = name;
  currentMemberType = type;

  try {
    let apiUrl = `/api/prs?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
    console.log('📡 Base API URL:', apiUrl);

    if (meow) {
      apiUrl += `&meow=${encodeURIComponent(meow)}`;
      console.log('📡 Added meow parameter:', apiUrl);
    }
    if (bhaw) {
      apiUrl += `&bhaw=${encodeURIComponent(bhaw)}`;
      console.log('📡 Added bhaw parameter:', apiUrl);
    }
    if (constituency) {
      apiUrl += `&constituency=${encodeURIComponent(constituency)}`;
      console.log('📡 Added constituency parameter:', apiUrl);
    }
    if (party) {
      apiUrl += `&party=${encodeURIComponent(party)}`;
      console.log('📡 Added party parameter:', apiUrl);
    }

    console.log('📡 Making parallel API request to:', apiUrl);
    
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();

    if (!data.found) {
      throw new Error('Member not found in any database');
    }

    currentRequestId = data.requestId;
    
    console.log(`✅ First data received from: ${data.firstSource}`);
    console.log(`📊 Both sources complete: ${data.bothComplete}`);
    console.log(`⏱️ Response time: ${data.timing?.total}ms`);

    currentCandidateData = data.candidateData || null;
    console.log("Current dTA",currentCandidateData)

    if (type === 'MP') {
      renderMPDashboardFromServerData(data, data.candidateData);
    } else {
      renderMLADashboardFromServerData(data, data.candidateData);
    }

    if (!data.bothComplete && currentRequestId) {
      console.log('⏳ Starting polling for secondary data source...');
      showPollingIndicator();
      startPolling(params);
    } else {
      console.log('✅ All data loaded immediately!');
    }

  } catch (err) {
    console.error('❌ Load error:', err);
    document.getElementById('content').innerHTML = `
      <div class="error-card">
        <div style="font-size: 5em; margin-bottom: 20px;">⚠️</div>
        <div style="font-size: 1.8em; font-weight: 800; color: #e74c3c; margin-bottom: 15px;">
          Unable to Load Profile
        </div>
        <div style="color: #64748b; font-size: 1.1em; margin-bottom: 30px;">
          ${escapeHtml(err.message)}
        </div>
        <a href="/" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; text-decoration: none; border-radius: 8px; font-weight: 700;">
          ← Back to Map
        </a>
      </div>
    `;
  }
}


// ============================================================================
// POLLING SYSTEM - FOR PROGRESSIVE DATA LOADING
// ============================================================================

function startPolling(params) {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  pollingAttempts = 0;
  
  pollingInterval = setInterval(async () => {
    pollingAttempts++;
    
    console.log(`🔄 Polling attempt ${pollingAttempts}/${MAX_POLL_ATTEMPTS}`);
    
    if (pollingAttempts > MAX_POLL_ATTEMPTS) {
      stopPolling();
      console.log('⏹️ Polling stopped: max attempts reached');
      showNotification('⚠️ Some additional data could not be loaded', 'warning');
      return;
    }

    try {
      let pollUrl = `/api/prs/poll/${currentRequestId}`;
      
      const response = await fetch(pollUrl);
      const result = await response.json();
      
      if (result.ready && result.data) {
        console.log('✅ Secondary data received! Updating dashboard...');
        stopPolling();
        
        if (result.data.candidateData) {
          currentCandidateData = result.data.candidateData;
        }
        
        updateDashboardWithNewData(result.data);
        
        showNotification('✨ Additional data loaded successfully!', 'success');
      }
      
    } catch (err) {
      console.error('❌ Polling error:', err);
    }
    
  }, POLL_INTERVAL);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  hidePollingIndicator();
}

// ============================================================================
// SMART DATA UPDATE - ONLY FILLS MISSING FIELDS
// ============================================================================

function updateDashboardWithNewData(newData) {
  console.log('🔄 Smart updating dashboard with secondary data...');
  
  let hasUpdates = false;

  // Helper: Check if field needs update
  const needsUpdate = (currentValue) => {
    return !currentValue || 
           currentValue === 'N/A' || 
           currentValue === 'Unknown' || 
           currentValue.trim() === '';
  };

  // Update personal info fields
  if (newData.personal) {
    const ageEl = document.querySelector('[data-field="age"]');
    if (ageEl && needsUpdate(ageEl.textContent) && newData.personal.age) {
      ageEl.textContent = newData.personal.age;
      animateFieldUpdate(ageEl);
      hasUpdates = true;
    }

    const eduEl = document.querySelector('[data-field="education"]');
    if (eduEl && needsUpdate(eduEl.textContent) && newData.personal.education) {
      eduEl.textContent = cleanEducation(newData.personal.education);
      animateFieldUpdate(eduEl);
      hasUpdates = true;
    }

    const genderEl = document.querySelector('[data-field="gender"]');
    if (genderEl && needsUpdate(genderEl.textContent) && newData.personal.gender) {
      genderEl.textContent = newData.personal.gender;
      animateFieldUpdate(genderEl);
      hasUpdates = true;
    }
  }

  // Update performance metrics if available
  if (newData.performance) {
    updatePerformanceMetrics(newData.performance);
    hasUpdates = true;
  }

  // Update tables if they're missing
  if (newData.html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(newData.html, 'text/html');
    
    const attendanceTable = doc.querySelector('#block-views-mps-attendance-block table');
    const debatesTable = doc.querySelector('#block-views-mps-debate-related-views-block table');
    const questionsTable = doc.querySelector('#block-views-mp-related-views-block-2222 table');
    
    if (attendanceTable && !document.querySelector('#attendance-content table')) {
      const container = document.getElementById('attendance-content');
      if (container) {
        container.innerHTML = attendanceTable.outerHTML;
        animateFieldUpdate(container);
        hasUpdates = true;
      }
    }
    
    if (debatesTable && !document.querySelector('#debates-content table')) {
      const container = document.getElementById('debates-content');
      if (container) {
        container.innerHTML = debatesTable.outerHTML;
        animateFieldUpdate(container);
        hasUpdates = true;
      }
    }
    
    if (questionsTable && !document.querySelector('#questions-content table')) {
      const container = document.getElementById('questions-content');
      if (container) {
        container.innerHTML = questionsTable.outerHTML;
        animateFieldUpdate(container);
        hasUpdates = true;
      }
    }
  }

  if (newData.candidateData && !document.querySelector('.quick-stats-banner')) {
    console.log('🔄 Re-rendering dashboard with complete data...');
    
    const mergedData = {
      ...currentMemberData,
      ...newData,
      personal: {
        ...(currentMemberData?.personal || {}),
        ...(newData.personal || {})
      }
    };
    
    if (currentMemberType === 'MP') {
      renderMPDashboardFromServerData(mergedData, newData.candidateData);
    } else {
      renderMLADashboardFromServerData(mergedData, newData.candidateData);
    }
    
    hasUpdates = true;
  }

  if (!hasUpdates) {
    console.log('ℹ️ No new data to update');
  }
}

// ============================================================================
// UPDATE PERFORMANCE METRICS - FIXED VERSION
// ============================================================================

function updatePerformanceMetrics(performance) {
  console.log('📊 Updating performance metrics...', performance);
  
  // Helper function to find stat card by title text
  const findStatCardByTitle = (titleText) => {
    const statCards = document.querySelectorAll('.stat-card');
    for (const card of statCards) {
      const titleElement = card.querySelector('.stat-title');
      if (titleElement && titleElement.textContent.toLowerCase().includes(titleText.toLowerCase())) {
        return card;
      }
    }
    return null;
  };

  // Helper to check if value needs update
  const needsUpdate = (value) => {
    return !value || value === 'N/A' || value === 'Unknown' || value.trim() === '';
  };

  // Update Attendance
  if (performance.attendance) {
    const attendanceCard = findStatCardByTitle('Attendance');
    if (attendanceCard) {
      const valueEl = attendanceCard.querySelector('.stat-value');
      if (valueEl && needsUpdate(valueEl.textContent)) {
        valueEl.textContent = performance.attendance;
        animateFieldUpdate(valueEl);
        console.log('✅ Updated attendance:', performance.attendance);
      }
    }
  }
  
  // Update Debates
  if (performance.debates) {
    const debatesCard = findStatCardByTitle('Debates');
    if (debatesCard) {
      const valueEl = debatesCard.querySelector('.stat-value');
      if (valueEl && needsUpdate(valueEl.textContent)) {
        valueEl.textContent = performance.debates;
        animateFieldUpdate(valueEl);
        console.log('✅ Updated debates:', performance.debates);
      }
    }
  }
  
  // Update Questions
  if (performance.questions) {
    const questionsCard = findStatCardByTitle('Questions');
    if (questionsCard) {
      const valueEl = questionsCard.querySelector('.stat-value');
      if (valueEl && needsUpdate(valueEl.textContent)) {
        valueEl.textContent = performance.questions;
        animateFieldUpdate(valueEl);
        console.log('✅ Updated questions:', performance.questions);
      }
    }
  }

  // Update Private Member Bills
  if (performance.pmb) {
    const pmbCard = findStatCardByTitle('Private Member Bills');
    if (pmbCard) {
      const valueEl = pmbCard.querySelector('.stat-value');
      if (valueEl && needsUpdate(valueEl.textContent)) {
        valueEl.textContent = performance.pmb;
        animateFieldUpdate(valueEl);
        console.log('✅ Updated PMB:', performance.pmb);
      }
    }
  }

  // Update national/state averages if available
  if (performance.natAttendance || performance.stateAttendance) {
    updateComparisonBars('Attendance', performance.attendance, performance.natAttendance, performance.stateAttendance);
  }
  
  if (performance.natDebates || performance.stateDebates) {
    updateComparisonBars('Debates', performance.debates, performance.natDebates, performance.stateDebates);
  }
  
  if (performance.natQuestions || performance.stateQuestions) {
    updateComparisonBars('Questions', performance.questions, performance.natQuestions, performance.stateQuestions);
  }
}

// ============================================================================
// UPDATE COMPARISON BARS
// ============================================================================

function updateComparisonBars(metricName, memberValue, nationalAvg, stateAvg) {
  const card = findStatCardByTitle(metricName);
  if (!card) return;

  const comparisonBars = card.querySelectorAll('.comparison-bar');
  
  const parseValue = (val) => {
    if (!val || val === 'N/A') return 0;
    return parseFloat(String(val).replace(/[^\d.-]/g, '')) || 0;
  };

  const memberNum = parseValue(memberValue);
  const nationalNum = parseValue(nationalAvg);
  const stateNum = parseValue(stateAvg);

  const maxVal = Math.max(memberNum, nationalNum, stateNum) || 1;

  comparisonBars.forEach(bar => {
    const label = bar.querySelector('.bar-label')?.textContent.toLowerCase();
    const barFill = bar.querySelector('.bar-fill');
    const barValue = bar.querySelector('.bar-value');
    
    if (!barFill || !barValue) return;

    if (label?.includes('selected')) {
      const percentage = (memberNum / maxVal * 100);
      barFill.style.width = percentage + '%';
      barValue.textContent = memberValue || 'N/A';
      animateFieldUpdate(barFill);
    } else if (label?.includes('national') && nationalAvg) {
      const percentage = (nationalNum / maxVal * 100);
      barFill.style.width = percentage + '%';
      barValue.textContent = nationalAvg;
      animateFieldUpdate(barFill);
    } else if (label?.includes('state') && stateAvg) {
      const percentage = (stateNum / maxVal * 100);
      barFill.style.width = percentage + '%';
      barValue.textContent = stateAvg;
      animateFieldUpdate(barFill);
    }
  });
}

// Helper function (make it globally accessible)
function findStatCardByTitle(titleText) {
  const statCards = document.querySelectorAll('.stat-card');
  for (const card of statCards) {
    const titleElement = card.querySelector('.stat-title');
    if (titleElement && titleElement.textContent.toLowerCase().includes(titleText.toLowerCase())) {
      return card;
    }
  }
  return null;
}

function animateFieldUpdate(element) {
  element.style.transition = 'all 0.5s ease';
  element.style.backgroundColor = '#fef3c7'; // Light yellow highlight
  element.style.transform = 'scale(1.05)';
  
  setTimeout(() => {
    element.style.backgroundColor = '';
    element.style.transform = '';
  }, 1500);
}



// ============================================================================
// UI HELPERS - POLLING INDICATOR & NOTIFICATIONS
// ============================================================================

function showPollingIndicator() {
  // Remove existing if any
  hidePollingIndicator();
  
  const indicator = document.createElement('div');
  indicator.id = 'polling-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 30px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 24px;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
    z-index: 9999;
    font-size: 0.95em;
    font-weight: 600;
    animation: slideInUp 0.3s ease;
  `;
  
  indicator.innerHTML = `
    <div style="
      width: 20px;
      height: 20px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    "></div>
    <span>Loading additional data...</span>
  `;
  
  document.body.appendChild(indicator);
}

function hidePollingIndicator() {
  const indicator = document.getElementById('polling-indicator');
  if (indicator) {
    indicator.style.animation = 'slideOutDown 0.3s ease';
    setTimeout(() => indicator.remove(), 300);
  }
}

function showNotification(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'custom-toast';
  
  const icons = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️'
  };
  
  const colors = {
    success: 'linear-gradient(135deg, #10b981, #059669)',
    warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
    error: 'linear-gradient(135deg, #ef4444, #dc2626)',
    info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
  };
  
  toast.style.cssText = `
    position: fixed;
    top: 30px;
    right: 30px;
    min-width: 320px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    padding: 18px 24px;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 14px;
    transform: translateX(400px);
    opacity: 0;
    transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    border-left: 5px solid;
    border-image: ${colors[type]} 1;
  `;
  
  toast.innerHTML = `
    <div style="font-size: 1.8em; line-height: 1;">${icons[type]}</div>
    <div style="flex: 1;">
      <div style="font-weight: 700; color: #1e293b; font-size: 1em; margin-bottom: 3px;">
        ${type.charAt(0).toUpperCase() + type.slice(1)}
      </div>
      <div style="color: #64748b; font-size: 0.9em;">
        ${message}
      </div>
    </div>
    <button onclick="this.parentElement.remove()" style="
      background: none;
      border: none;
      font-size: 1.5em;
      color: #94a3b8;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s;
    " onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">
      ×
    </button>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  }, 10);
  
  setTimeout(() => {
    toast.style.transform = 'translateX(400px)';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

window.addEventListener('beforeunload', () => {
  stopPolling();
});





function renderMPDashboardFromServerData(prsData, candidateData) {
  console.log('🎨 Rendering MP Dashboard');
  console.log('PRS Data received:', prsData);

  const data = {
    name: currentMemberName,
    imageUrl: prsData.imageUrl,
    state: prsData.state,
    constituency: prsData.constituency,
    party: prsData.party,
    type: 'MP',
    age: 'N/A',
    gender: 'N/A',
    education: 'N/A',
    termStart: 'N/A',
    termEnd: 'N/A',
    noOfTerm: 'N/A',
    attendance: 'N/A',
    natAttendance: 'N/A',
    stateAttendance: 'N/A',
    debates: 'N/A',
    natDebates: 'N/A',
    stateDebates: 'N/A',
    questions: 'N/A',
    natQuestions: 'N/A',
    stateQuestions: 'N/A',
    pmb: 'N/A',
    natPMB: 'N/A',
    attendanceTable: '',
    debatesTable: '',
    questionsTable: ''
  };

  // ✅ FIXED: Directly use the table data from prsData
  if (prsData.attendanceTable) {
    data.attendanceTable = prsData.attendanceTable;
    console.log('✅ Attendance table loaded directly from prsData');
  }
  
  if (prsData.debatesTable) {
    data.debatesTable = prsData.debatesTable;
    console.log('✅ Debates table loaded directly from prsData');
  }
  
  if (prsData.questionsTable) {
    data.questionsTable = prsData.questionsTable;
    console.log('✅ Questions table loaded directly from prsData');
  }

  // Merge performance data
  if (prsData.performance) {
    Object.keys(prsData.performance).forEach(key => {
      if (prsData.performance[key]) data[key] = prsData.performance[key];
    });
  }

  // Merge personal data
  if (prsData.personal) {
    if (prsData.personal.age) data.age = prsData.personal.age;
    if (prsData.personal.gender) data.gender = prsData.personal.gender;
    if (prsData.personal.education) data.education = prsData.personal.education;
    if (prsData.personal.termStart) data.termStart = prsData.personal.termStart;
    if (prsData.personal.termEnd) data.termEnd = prsData.personal.termEnd;
    if (prsData.personal.noOfTerm) data.noOfTerm = prsData.personal.noOfTerm;
  }

  // ✅ FALLBACK: Only if tables are missing, try to parse from HTML
  if ((!data.attendanceTable || !data.debatesTable || !data.questionsTable) && prsData.html) {
    console.log('⚠️ Some tables missing, attempting to parse from HTML...');
    const parser = new DOMParser();
    const doc = parser.parseFromString(prsData.html, 'text/html');
    
    if (!data.attendanceTable) {
      const attendanceTableEl = doc.querySelector('#block-views-mps-attendance-block table');
      if (attendanceTableEl) {
        data.attendanceTable = attendanceTableEl.outerHTML;
        console.log('✅ Attendance table extracted from HTML');
      }
    }
    
    if (!data.debatesTable) {
      const debatesTableEl = doc.querySelector('#block-views-mps-debate-related-views-block table');
      if (debatesTableEl) {
        data.debatesTable = debatesTableEl.outerHTML;
        console.log('✅ Debates table extracted from HTML');
      }
    }
    
    if (!data.questionsTable) {
      const questionsTableEl = doc.querySelector('#block-views-mp-related-views-block-2222 table');
      if (questionsTableEl) {
        data.questionsTable = questionsTableEl.outerHTML;
        console.log('✅ Questions table extracted from HTML');
      }
    }
  }

  console.log('📊 Final table status:', {
    hasAttendanceTable: !!data.attendanceTable,
    hasDebatesTable: !!data.debatesTable,
    hasQuestionsTable: !!data.questionsTable,
    attendanceLength: data.attendanceTable?.length || 0,
    debatesLength: data.debatesTable?.length || 0,
    questionsLength: data.questionsTable?.length || 0
  });

  currentMemberData = data;
  renderDashboard(data, candidateData); 
}
function renderMLADashboardFromServerData(prsData, candidateData) {
  console.log('🎨 Rendering MLA Dashboard');
  
  const data = {
    name: currentMemberName,
    imageUrl: prsData.imageUrl,
    state: prsData.state,
    constituency: prsData.constituency,
    party: prsData.party,
    type: 'MLA',
    age: 'N/A',
    gender: 'N/A',
    education: 'N/A',
    termStart: 'N/A',
    termEnd: 'N/A',
    attendance: 'N/A',
    natAttendance: 'N/A',
    stateAttendance: 'N/A',
    debates: 'N/A',
    natDebates: 'N/A',
    stateDebates: 'N/A',
    questions: 'N/A',
    natQuestions: 'N/A',
    stateQuestions: 'N/A',
    pmb: 'N/A',
    natPMB: 'N/A',
    attendanceTable: '',
    debatesTable: '',
    questionsTable: ''
  };

  // ✅ FIXED: Directly use table data
  if (prsData.attendanceTable) data.attendanceTable = prsData.attendanceTable;
  if (prsData.debatesTable) data.debatesTable = prsData.debatesTable;
  if (prsData.questionsTable) data.questionsTable = prsData.questionsTable;

  // Merge personal data
  if (prsData.personal) {
    if (prsData.personal.age) data.age = prsData.personal.age;
    if (prsData.personal.gender) data.gender = prsData.personal.gender;
    if (prsData.personal.education) data.education = prsData.personal.education;
    if (prsData.personal.termStart) data.termStart = prsData.personal.termStart;
    if (prsData.personal.termEnd) data.termEnd = prsData.personal.termEnd;
  }

  // Merge performance data if available
  if (prsData.performance) {
    Object.keys(prsData.performance).forEach(key => {
      if (prsData.performance[key]) data[key] = prsData.performance[key];
    });
  }

  console.log('📊 MLA table status:', {
    hasAttendanceTable: !!data.attendanceTable,
    hasDebatesTable: !!data.debatesTable,
    hasQuestionsTable: !!data.questionsTable
  });

  currentMemberData = data;
  renderDashboard(data, candidateData); 
}
    // ============================================================================
// DATA MERGING HELPER - Fills missing fields from candidateData
// ============================================================================
function mergeCandidateDataIntoMain(data, candidateData) {
  if (!candidateData) return data;
  
  const merged = { ...data };
  
  const needsUpdate = (value) => {
    return !value || value === 'N/A' || value === 'Unknown' || String(value).trim() === '';
  };
  
  const getCandidateValue = (field) => {
    return candidateData.candidate?.[field] || candidateData[field];
  };
  
  const fieldsToMerge = ['age', 'gender', 'constituency', 'party', 'imageUrl', 'state'];
  
  fieldsToMerge.forEach(field => {
    if (needsUpdate(merged[field])) {
      const candidateValue = getCandidateValue(field);
      
      if (candidateValue && !needsUpdate(candidateValue)) {
        merged[field] = candidateValue;
        console.log(`✅ Filled ${field} from candidateData:`, candidateValue);
      }
    }
  });
  
  if (needsUpdate(merged.education)) {
    const candidateEducation = getCandidateValue('education');
    if (candidateEducation && !needsUpdate(candidateEducation)) {
      merged.education = cleanEducation(candidateEducation);
      console.log(`✅ Filled education from candidateData:`, merged.education);
    }
  }
  
  if (needsUpdate(merged.relation)) {
    const candidateRelation = getCandidateValue('relation');
    if (candidateRelation && !needsUpdate(candidateRelation)) {
      merged.relation = candidateRelation;
    }
  }
  
  return merged;
}




async function getValidImageUrl(data, candidateData) {
  const defaultKeywords = ['placeholder', 'default', 'avatar', 'no-image', 'notfound'];
  
  const isPlaceholder = (url) => {
    if (!url) return true;
    const urlLower = url.toLowerCase();
    return defaultKeywords.some(keyword => urlLower.includes(keyword)) || 
           url.includes('via.placeholder.com');
  };
  
  const testImageUrl = (url) => {
    return new Promise((resolve) => {
      if (!url || isPlaceholder(url)) {
        resolve(false);
        return;
      }
      
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
      
      setTimeout(() => resolve(false), 3000);
    });
  };
  
  const imageUrls = [];
  
  if (data.imageUrl) {
    imageUrls.push({ source: 'PRS India', url: data.imageUrl });
  }
  
  if (candidateData?.candidate?.imageUrl) {
    imageUrls.push({ source: 'MyNeta', url: candidateData.candidate.imageUrl });
  }
  if (candidateData?.imageUrl) {
    imageUrls.push({ source: 'MyNeta', url: candidateData.imageUrl });
  }
  
  if (currentMemberName) {
   const cleanName = currentMemberName
  .toLowerCase()
  .replace(/\+/g, ' ')       
  .replace(/\s+/g, '-')    
  .replace(/[^a-z0-9-]/g, '');

    
    const alternativeUrls = [
      `https://myneta.info/images/${cleanName}.jpg`,
      `https://prsindia.org/mptrack/sites/default/files/member_images/${cleanName}.jpg`,
      `https://sansad.in/getFile/loksabhampimage?mpcodeval=${cleanName}`,
    ];
    
    alternativeUrls.forEach(url => {
      imageUrls.push({ source: 'Alternative', url });
    });
  }
  
  console.log(`🖼️ Testing ${imageUrls.length} image URLs...`);
  
  for (const { source, url } of imageUrls) {
    console.log(`🔍 Testing image from ${source}: ${url}`);
    
    const isValid = await testImageUrl(url);
    
    if (isValid) {
      console.log(`✅ Valid image found from ${source}`);
      return { url, source };
    } else {
      console.log(`❌ Invalid image from ${source}`);
    }
  }
  
  console.log('⚠️ No valid images found, using placeholder');
  return { 
    url: 'https://via.placeholder.com/200/667eea/ffffff?text=' + 
         encodeURIComponent(currentMemberName?.charAt(0) || '?'), 
    source: 'Placeholder' 
  };
}

     function renderDashboard(data, candidateData = null) {
  console.log('🎨 Rendering COMPLETE dashboard with ALL data');
  console.log('data', data);
  console.log("candidate data", candidateData);



  data = mergeCandidateDataIntoMain(data, candidateData);
  console.log('Merged data:', data);



 if (candidateData && candidateData.candidate && candidateData.candidate.education) {
    candidateData.candidate.education = cleanEducation(candidateData.candidate.education);
  }

 let imageUrl = data.imageUrl || 'https://via.placeholder.com/200';
  let imageSource = 'PRS India';
  
  getValidImageUrl(data, candidateData).then(result => {
    const imgElement = document.querySelector('.profile-image');
    if (imgElement && result.url !== imgElement.src) {
      console.log(`🔄 Updating image to source: ${result.source}`);
      imgElement.src = result.url;
      
      const wrapper = document.querySelector('.profile-image-wrapper');
      if (wrapper && result.source !== 'Placeholder') {
        const existingBadge = wrapper.querySelector('.image-source-badge');
        if (existingBadge) existingBadge.remove();
        
        const sourceBadge = document.createElement('div');
            sourceBadge.className = 'image-source-badge';
      sourceBadge.innerHTML = `✓ Official Profile`; 
        wrapper.appendChild(sourceBadge);
      }
    }
  });

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalBankAccounts = 0;
  let totalVehicles = 0;
  let totalProperties = 0;
  let totalCash = 0;
  let totalJewellery = 0;
  let totalLoans = 0;
  let criminalCases = 0;

  if (candidateData) {
    criminalCases = candidateData.crimeOMeter?.cases || candidateData.criminalCases?.pendingCases?.filter(c => c.serialNo && c.serialNo !== '---------No Cases--------' && c.serialNo !== 'Serial No.').length || 0;

    if (candidateData.movableAssets && Array.isArray(candidateData.movableAssets)) {
      candidateData.movableAssets.forEach(asset => {
        if (asset.total && asset.total !== 'Nil' && !asset.total.includes('70')) {
          const match = asset.total.match(/Rs\s*([\d,]+)/);
          if (match) {
            const num = parseInt(match[1].replace(/,/g, ''));
            if (!isNaN(num) && num > 100) totalAssets += num;
          }
        }
        
        if (asset.description && asset.description.toLowerCase().includes('cash') && asset.self && asset.self !== 'Nil') {
          const match = asset.self.match(/Rs\s*([\d,]+)/);
          if (match) {
            totalCash = parseInt(match[1].replace(/,/g, ''));
          }
        }
        
        if (asset.description && asset.description.toLowerCase().includes('deposits in banks') && asset.self && asset.self !== 'Nil') {
          totalBankAccounts = parseBankAccounts(asset.self).length;
        }
        
        if (asset.description && asset.description.toLowerCase().includes('motor vehicles') && asset.self && asset.self !== 'Nil') {
          totalVehicles = parseVehicles(asset.self).length;
        }

        if (asset.description && asset.description.toLowerCase().includes('jewellery') && asset.total && asset.total !== 'Nil') {
          const match = asset.total.match(/Rs\s*([\d,]+)/);
          if (match) {
            totalJewellery = parseInt(match[1].replace(/,/g, ''));
          }
        }
      });
    }

    if (candidateData.immovableAssets && Array.isArray(candidateData.immovableAssets)) {
      candidateData.immovableAssets.forEach(asset => {
        if (asset.total && asset.total !== 'Nil' && !asset.total.includes('70')) {
          const match = asset.total.match(/Rs\s*([\d,]+)/);
          if (match) {
            const num = parseInt(match[1].replace(/,/g, ''));
            if (!isNaN(num) && num > 100) {
              totalAssets += num;
              totalProperties++;
            }
          }
        }
      });
    }

    if (candidateData.liabilities && Array.isArray(candidateData.liabilities)) {
      candidateData.liabilities.forEach(liability => {
        if (liability.total && liability.total !== 'Nil') {
          const match = liability.total.match(/Rs\s*([\d,]+)/);
          if (match) {
            const num = parseInt(match[1].replace(/,/g, ''));
            if (!isNaN(num)) {
              totalLiabilities += num;
              totalLoans++;
            }
          }
        }
      });
    }
  }

  const hasAttendance = data.attendance && data.attendance !== 'N/A';
  const hasDebates = data.debates && data.debates !== 'N/A' && data.debates !== '0';
  const hasQuestions = data.questions && data.questions !== 'N/A' && data.questions !== '0';
  const hasPMB = data.pmb && data.pmb !== 'N/A';
  
  const hasPerformance = hasAttendance || hasDebates || hasQuestions || hasPMB;

  const statsIcons = {
    assets: '💰',
    netWorth: '📊',
    banks: '🏦',
    vehicles: '🚗',
    properties: '🏠',
    cases: '⚖️'
  };

  let quickStatsHTML = '';
  if (candidateData) {
    quickStatsHTML = `
      <div class="quick-stats-banner">
        <div class="quick-stat-item">
          <div class="quick-stat-icon">${statsIcons.assets}</div>
          <div class="quick-stat-value">${formatCurrency('Rs ' + totalAssets)}</div>
          <div class="quick-stat-label">Total Assets</div>
        </div>
        <div class="quick-stat-item">
          <div class="quick-stat-icon">${statsIcons.netWorth}</div>
          <div class="quick-stat-value">${formatCurrency('Rs ' + (totalAssets - totalLiabilities))}</div>
          <div class="quick-stat-label">Net Worth</div>
        </div>
        <div class="quick-stat-item">
          <div class="quick-stat-icon">${statsIcons.banks}</div>
          <div class="quick-stat-value">${totalBankAccounts}</div>
          <div class="quick-stat-label">Bank Accounts</div>
        </div>
        <div class="quick-stat-item">
          <div class="quick-stat-icon">${statsIcons.vehicles}</div>
          <div class="quick-stat-value">${totalVehicles}</div>
          <div class="quick-stat-label">Vehicles</div>
        </div>
        <div class="quick-stat-item">
          <div class="quick-stat-icon">${statsIcons.properties}</div>
          <div class="quick-stat-value">${totalProperties}</div>
          <div class="quick-stat-label">Properties</div>
        </div>
        <div class="quick-stat-item">
          <div class="quick-stat-icon">${statsIcons.cases}</div>
          <div class="quick-stat-value" style="${criminalCases > 0 ? 'background: linear-gradient(135deg, #fca5a5, #ef4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent;' : ''}">${criminalCases}</div>
          <div class="quick-stat-label">Criminal Cases</div>
        </div>
      </div>
    `;
  }

  let statsHTML = '';
  if (hasPerformance) {
    const stats = [];

    if (hasAttendance) {
      stats.push(createStatCard('Attendance', data.attendance, data.natAttendance || 'N/A', data.stateAttendance || 'N/A', '📊', 'linear-gradient(135deg, #667eea, #764ba2)'));
    }
    
    if (hasDebates) {
      stats.push(createStatCard('Debates', data.debates, data.natDebates || 'N/A', data.stateDebates || 'N/A', '💬', 'linear-gradient(135deg, #8b5cf6, #7c3aed)'));
    }
    
    if (hasQuestions) {
      stats.push(createStatCard('Questions', data.questions, data.natQuestions || 'N/A', data.stateQuestions || 'N/A', '❓', 'linear-gradient(135deg, #06b6d4, #0891b2)'));
    }
    
    if (hasPMB) {
      stats.push(createStatCard('Private Member Bills', data.pmb, data.natPMB || 'N/A', 'N/A', '📄', 'linear-gradient(135deg, #10b981, #059669)'));
    }

    if (stats.length > 0) {
  statsHTML = `
    <div class="section-header-main reveal">
      <h2><span class="icon">📊</span>Parliamentary Activity</h2>
    </div>
    <div class="performance-section reveal">
      <div class="stats-grid">${stats.join('')}</div>
    </div>
  `;
}
  } else {
    statsHTML = `
      <div class="details-section reveal">
        <div class="no-data-placeholder">
          <div class="icon">📊</div>
          <div style="font-size: 1.3em; color: #475569; font-weight: 600; margin-bottom: 10px;">
            ${data.type === 'MLA' ? 'Performance Metrics Not Available' : 'Performance Data Not Available'}
          </div>
          <div style="font-size: 1em; max-width: 500px; margin: 0 auto; color: #64748b;">
            ${data.type === 'MLA' ? 'Detailed performance metrics are typically available for MPs. MLA profiles show basic information and affidavit data.' : 'Performance data is not available for this member at the moment.'}
          </div>
        </div>
      </div>
    `;
  }

  let detailsHTML = '';

  if (data.attendanceTable) {
    detailsHTML += `
      <div class="details-section reveal">
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
      <div class="details-section reveal">
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
      <div class="details-section reveal">
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

  // ========================================
  // AFFIDAVIT DATA - COMPLETE RENDERING
  // ========================================
  if (candidateData && candidateData.candidate) {
    console.log('✅ Rendering ALL candidate data sections');

    detailsHTML += `
      <div class="section-header-main reveal">
        <h2><span class="icon">📄</span>Affidavit Information</h2>
      </div>
    `;

    // Personal Details
    if (candidateData.candidate) {
      detailsHTML += `
        <div class="details-section reveal">
          <div class="summary-card">
            <div class="summary-card-title">👤 Personal Details</div>
            <div class="grid-2">
              ${candidateData.candidate.age ? `
                <div class="data-row">
                  <div class="data-label">🎂 Age</div>
                  <div class="data-value">${safeText(candidateData.candidate.age)} years</div>
                </div>
              ` : ''}
              ${candidateData.candidate.relation ? `
                <div class="data-row">
                  <div class="data-label">👨‍👩‍👦 Relation</div>
                  <div class="data-value">${safeText(candidateData.candidate.relation)}</div>
                </div>
              ` : ''}
              ${candidateData.candidate.voterEnrollment ? `
                <div class="data-row">
                  <div class="data-label">🗳️ Voter Enrollment</div>
                  <div class="data-value">${safeText(candidateData.candidate.voterEnrollment)}</div>
                </div>
              ` : ''}
              ${candidateData.candidate.education ? `
                <div class="data-row">
                  <div class="data-label">🎓 Education</div>
                  <div class="data-value">${safeText(candidateData.candidate.education)}</div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }

    // ========================================
// AI-POWERED SUMMARY - MAGNIFICENT SECTION
// ========================================
console.log("Ai Summary",candidateData.aiSummary)
// ========================================
// COMPREHENSIVE POLITICAL ANALYSIS
// ========================================
if (candidateData.aiSummary && candidateData.aiSummary.available === true) {
  console.log('✅ Rendering Comprehensive Political Analysis');
  
  const analysisData = candidateData.aiSummary.summary;
  const politician = candidateData.aiSummary.politician || currentMemberName;
  
  detailsHTML += `
    <div class="section-header-main reveal" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%);">
      <h2>
        <span class="icon analysis-sparkle">📊</span>
        Comprehensive Political Analysis
        <span class="analysis-badge-header">IN-DEPTH RESEARCH</span>
      </h2>
    </div>

    <div class="analysis-summary-container reveal">
      <!-- Analysis Header Banner -->
      <div class="analysis-header-banner">
        <div class="analysis-particles"></div>
        <div class="analysis-header-content">
          <div class="analysis-avatar">
            <div class="analysis-avatar-ring"></div>
            <div class="analysis-avatar-inner">📋</div>
          </div>
          <div class="analysis-header-text">
            <h3 class="analysis-politician-name">${escapeHtml(politician)}</h3>
            <p class="analysis-subtitle">Multi-Source Political Intelligence & Public Perception Analysis</p>
            <div class="analysis-meta">
              <span class="analysis-meta-item">
                <span class="analysis-meta-icon">📚</span>
                Comprehensive Research
              </span>
              <span class="analysis-meta-item">
                <span class="analysis-meta-icon">🔍</span>
                Web-Scraped Data
              </span>
              <span class="analysis-meta-item">
                <span class="analysis-meta-icon">📅</span>
                ${new Date(candidateData.aiSummary.parsedAt || Date.now()).toLocaleDateString('en-IN', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Core Analysis Grid -->
      <div class="analysis-insights-grid">
        ${analysisData.identity ? `
          <div class="analysis-insight-card analysis-card-identity">
            <div class="analysis-card-header">
              <div class="analysis-card-icon">🎭</div>
              <h4 class="analysis-card-title">Political Identity & Background</h4>
            </div>
            <div class="analysis-card-content">
              <p class="analysis-text">${escapeHtml(analysisData.identity)}</p>
            </div>
            <div class="analysis-card-footer">
              <span class="analysis-tag">Political Journey</span>
            </div>
          </div>
        ` : ''}

        ${analysisData.reputation ? `
          <div class="analysis-insight-card analysis-card-reputation">
            <div class="analysis-card-header">
              <div class="analysis-card-icon">⭐</div>
              <h4 class="analysis-card-title">Public Reputation & Leadership Style</h4>
            </div>
            <div class="analysis-card-content">
              <p class="analysis-text">${escapeHtml(analysisData.reputation)}</p>
            </div>
            <div class="analysis-card-footer">
              <span class="analysis-tag">Leadership Profile</span>
            </div>
          </div>
        ` : ''}

        ${analysisData.publicOpinion ? `
          <div class="analysis-insight-card analysis-card-opinion">
            <div class="analysis-card-header">
              <div class="analysis-card-icon">💭</div>
              <h4 class="analysis-card-title">Public Opinion & Sentiment</h4>
            </div>
            <div class="analysis-card-content">
              <p class="analysis-text">${escapeHtml(analysisData.publicOpinion)}</p>
            </div>
            <div class="analysis-card-footer">
              <span class="analysis-tag">Public Sentiment</span>
            </div>
          </div>
        ` : ''}

        ${analysisData.currentTalk ? `
          <div class="analysis-insight-card analysis-card-current">
            <div class="analysis-card-header">
              <div class="analysis-card-icon">📰</div>
              <h4 class="analysis-card-title">Current Political Discourse</h4>
            </div>
            <div class="analysis-card-content">
              <p class="analysis-text">${escapeHtml(analysisData.currentTalk)}</p>
            </div>
            <div class="analysis-card-footer">
              <span class="analysis-tag">Recent Focus</span>
            </div>
          </div>
        ` : ''}

        ${analysisData.promisesVsReality ? `
          <div class="analysis-insight-card analysis-card-promises">
            <div class="analysis-card-header">
              <div class="analysis-card-icon">📝</div>
              <h4 class="analysis-card-title">Promises vs Reality Check</h4>
            </div>
            <div class="analysis-card-content">
              <p class="analysis-text">${escapeHtml(analysisData.promisesVsReality)}</p>
            </div>
            <div class="analysis-card-footer">
              <span class="analysis-tag">Performance Review</span>
            </div>
          </div>
        ` : ''}

        ${analysisData.controversies ? `
          <div class="analysis-insight-card analysis-card-controversies">
            <div class="analysis-card-header">
              <div class="analysis-card-icon">⚠️</div>
              <h4 class="analysis-card-title">Controversies & Challenges</h4>
            </div>
            <div class="analysis-card-content">
              <p class="analysis-text">${escapeHtml(analysisData.controversies)}</p>
            </div>
            <div class="analysis-card-footer">
              <span class="analysis-tag">Controversy Track</span>
            </div>
          </div>
        ` : ''}

        ${analysisData.criticView ? `
          <div class="analysis-insight-card analysis-card-critics">
            <div class="analysis-card-header">
              <div class="analysis-card-icon">🔍</div>
              <h4 class="analysis-card-title">Critical Perspective</h4>
            </div>
            <div class="analysis-card-content">
              <p class="analysis-text">${escapeHtml(analysisData.criticView)}</p>
            </div>
            <div class="analysis-card-footer">
              <span class="analysis-tag">Opposition View</span>
            </div>
          </div>
        ` : ''}
${analysisData.supporterView ? `
  <div class="analysis-insight-card analysis-card-supporters">
    <div class="analysis-card-header">
      <div class="analysis-card-icon">👍</div>
      <h4 class="analysis-card-title">Supporter Perspective</h4>
    </div>
    <div class="analysis-card-content">
      <p class="analysis-text">${escapeHtml(analysisData.supporterView)}</p>
    </div>
    <div class="analysis-card-footer">
      <span class="analysis-tag">Support Base View</span>
    </div>
  </div>
` : ''}

${analysisData.economicRecord ? `
  <div class="analysis-insight-card analysis-card-economic">
    <div class="analysis-card-header">
      <div class="analysis-card-icon">📈</div>
      <h4 class="analysis-card-title">Economic Record & Policies</h4>
    </div>
    <div class="analysis-card-content">
      <p class="analysis-text">${escapeHtml(analysisData.economicRecord)}</p>
    </div>
    <div class="analysis-card-footer">
      <span class="analysis-tag">Economic Performance</span>
    </div>
  </div>
` : ''}
        ${analysisData.definingMoments ? `
          <div class="analysis-insight-card analysis-card-moments">
            <div class="analysis-card-header">
              <div class="analysis-card-icon">🏆</div>
              <h4 class="analysis-card-title">Defining Moments</h4>
            </div>
            <div class="analysis-card-content">
              <p class="analysis-text">${escapeHtml(analysisData.definingMoments)}</p>
            </div>
            <div class="analysis-card-footer">
              <span class="analysis-tag">Key Milestones</span>
            </div>
          </div>
        ` : ''}

        ${analysisData.threats ? `
          <div class="analysis-insight-card analysis-card-threats">
            <div class="analysis-card-header">
              <div class="analysis-card-icon">🛡️</div>
              <h4 class="analysis-card-title">Political Threats & Challenges</h4>
            </div>
            <div class="analysis-card-content">
              <p class="analysis-text">${escapeHtml(analysisData.threats)}</p>
            </div>
            <div class="analysis-card-footer">
              <span class="analysis-tag">Risk Analysis</span>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Bottom Line - Featured -->
      ${analysisData.bottomLine ? `
        <div class="analysis-bottom-line">
          <div class="analysis-quote-icon">💡</div>
          <div class="analysis-quote-content">
            <h5 class="analysis-quote-title">Summary Assessment</h5>
            <p class="analysis-quote-text">${escapeHtml(analysisData.bottomLine)}</p>
          </div>
          <div class="analysis-quote-decoration"></div>
        </div>
      ` : ''}

      <!-- Data Source Notice -->
      <div class="analysis-disclaimer">
        <span class="analysis-disclaimer-icon">📌</span>
        <p>
          <strong>Data Sources:</strong> This comprehensive analysis is compiled from multiple public sources, 
          news archives, official records, and web-scraped political intelligence. Information is aggregated 
          and presented for informational purposes.
        </p>
      </div>
    </div>
  `;
}

    // ========================================
    // CRIMINAL CASES - DETAILED
    // ========================================
    if (candidateData.criminalCases) {
      const pendingCases = candidateData.criminalCases.pendingCases?.filter(c => 
        c.serialNo && c.serialNo !== '---------No Cases--------' && c.serialNo !== 'Serial No.'
      ) || [];

      const convictedCases = candidateData.criminalCases.convictedCases?.filter(c => 
        c.serialNo && c.serialNo !== '---------No Cases--------'
      ) || [];

      const briefIPC = candidateData.criminalCases.briefIPC || [];

      if (pendingCases.length > 0 || convictedCases.length > 0 || briefIPC.length > 0) {
        detailsHTML += `
          <div class="section-header-main reveal">
            <h2><span class="icon">⚖️</span>Criminal Cases</h2>
          </div>
        `;

        if (briefIPC.length > 0) {
          detailsHTML += `
            <div class="details-section reveal">
              <div class="summary-card" style="background: linear-gradient(135deg, #fef2f2, #fee2e2);">
                <div class="summary-card-title" style="color: #991b1b;">⚠️ IPC Sections Summary</div>
                <div class="grid-2">
                  ${briefIPC.map(ipc => `
                    <div class="card-item" style="border-left-color: #ef4444;">
                      <div style="font-weight: 800; color: #991b1b; margin-bottom: 8px;">
                        ${safeText(ipc.section)}
                      </div>
                      <div style="font-size: 1.5em; font-weight: 900; color: #dc2626;">
                        ${ipc.count} ${ipc.count === 1 ? 'Case' : 'Cases'}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        }

        if (pendingCases.length > 0) {
          detailsHTML += `
            <div class="details-section reveal">
              <div class="summary-card">
                <div class="summary-card-title">⏳ Pending Cases (${pendingCases.length})</div>
                <div style="overflow-x: auto;">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>FIR No.</th>
                        <th>Case No.</th>
                        <th>Court</th>
                        <th>IPC Sections</th>
                        <th>Charges Framed</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${pendingCases.map(c => `
                        <tr>
                          <td><strong>${safeText(c.serialNo)}</strong></td>
                          <td>${safeText(c.firNo)}</td>
                          <td>${safeText(c.caseNo)}</td>
                          <td>${safeText(c.court)}</td>
                          <td><span class="badge badge-danger">${safeText(c.ipcSections)}</span></td>
                          <td><span class="badge ${c.chargesFramed === 'Yes' ? 'badge-danger' : 'badge-warning'}">${safeText(c.chargesFramed)}</span></td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          `;
        }

        if (convictedCases.length > 0) {
          detailsHTML += `
            <div class="details-section reveal">
              <div class="summary-card" style="background: linear-gradient(135deg, #fef2f2, #fee2e2);">
                <div class="summary-card-title" style="color: #991b1b;">🚨 Convicted Cases (${convictedCases.length})</div>
                <div style="overflow-x: auto;">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Details</th>
                        <th>Punishment</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${convictedCases.map(c => `
                        <tr>
                          <td><strong>${safeText(c.serialNo)}</strong></td>
                          <td>${safeText(c.details || c.caseDetails || 'N/A')}</td>
                          <td><span class="badge badge-danger">${safeText(c.punishment || 'N/A')}</span></td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          `;
        }

        if (pendingCases.length === 0 && convictedCases.length === 0) {
          detailsHTML += `
            <div class="details-section reveal">
              <div class="summary-card" style="background: linear-gradient(135deg, #f0fdf4, #dcfce7);">
                <div style="text-align: center; padding: 40px;">
                  <div style="font-size: 4em; margin-bottom: 15px;">✅</div>
                  <div style="font-size: 1.3em; font-weight: 800; color: #166534;">No Criminal Cases</div>
                  <div style="color: #15803d; margin-top: 10px;">Clean record - No pending or convicted cases</div>
                </div>
              </div>
            </div>
          `;
        }
      }
    }

    // ========================================
    // INCOME TAX RETURNS - DETAILED
    // ========================================
    if (candidateData.incomeTax && Array.isArray(candidateData.incomeTax)) {
      const selfIncome = candidateData.incomeTax.find(i => i.relation === 'self');
      const spouseIncome = candidateData.incomeTax.find(i => i.relation === 'spouse');
      const hufIncome = candidateData.incomeTax.find(i => i.relation === 'huf');

      if (selfIncome && selfIncome.income) {
        detailsHTML += `
          <div class="section-header-main reveal">
            <h2><span class="icon">💵</span>Income Tax Returns</h2>
          </div>
        `;
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
      
      if (year && amount && year !== 'None' && !amount.includes('Rs 0')) {
        years.push({ year, amount });
      }
    }
  }
  
  return years;
};
        const selfYears = parseIncomeSeries(selfIncome.income);
        const spouseYears = spouseIncome ? parseIncomeSeries(spouseIncome.income) : [];
        const hufYears = hufIncome ? parseIncomeSeries(hufIncome.income) : [];

        if (selfYears.length > 0) {
          detailsHTML += `
            <div class="details-section reveal">
              <div class="summary-card">
                <div class="summary-card-title">👤 Self Income (Last 5 Years)</div>
                <div class="grid-2">
                  ${selfYears.map(y => `
                    <div class="card-item income">
                      <div style="font-weight: 700; color: #5b21b6; margin-bottom: 8px;">${safeText(y.year)}</div>
                      <div style="font-size: 1.4em; font-weight: 900; color: #7c3aed;">${safeText(y.amount)}</div>
                    </div>
                  `).join('')}
                </div>
                ${selfIncome.pan === 'Y' ? `
                  <div style="margin-top: 15px; padding: 12px; background: #f0fdf4; border-radius: 10px; text-align: center;">
                    <span class="badge badge-success">✓ PAN Available</span>
                  </div>
                ` : ''}
              </div>
            </div>
          `;
        }

        if (spouseYears.length > 0) {
          detailsHTML += `
            <div class="details-section reveal">
              <div class="summary-card">
                <div class="summary-card-title">👰 Spouse Income (Last 5 Years)</div>
                <div class="grid-2">
                  ${spouseYears.map(y => `
                    <div class="card-item income">
                      <div style="font-weight: 700; color: #5b21b6; margin-bottom: 8px;">${safeText(y.year)}</div>
                      <div style="font-size: 1.4em; font-weight: 900; color: #7c3aed;">${safeText(y.amount)}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        }

        if (hufYears.length > 0) {
          detailsHTML += `
            <div class="details-section reveal">
              <div class="summary-card">
                <div class="summary-card-title">🏠 HUF Income (Last 5 Years)</div>
                <div class="grid-2">
                  ${hufYears.map(y => `
                    <div class="card-item income">
                      <div style="font-weight: 700; color: #5b21b6; margin-bottom: 8px;">${safeText(y.year)}</div>
                      <div style="font-size: 1.4em; font-weight: 900; color: #7c3aed;">${safeText(y.amount)}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        }
      }
    }

    // ========================================
    // MOVABLE ASSETS - DETAILED BREAKDOWN
    // ========================================
   // ========================================
// MOVABLE ASSETS - COMPLETE DYNAMIC RENDERING
// ========================================
if (candidateData.movableAssets && Array.isArray(candidateData.movableAssets)) {
  console.log('💎 Rendering ALL movable assets dynamically...');
  
  detailsHTML += `
    <div class="section-header-main reveal">
      <h2><span class="icon">💎</span>Movable Assets</h2>
    </div>
  `;

  // ASSET CATEGORY CONFIGURATION - Maps srNo to metadata
  const assetCategoryConfig = {
    'i': { 
      name: 'Cash in Hand', 
      icon: '💵', 
      color: '#10b981',
      type: 'simple'
    },
    'ii': { 
      name: 'Bank Deposits & Fixed Deposits', 
      icon: '🏦', 
      color: '#3b82f6',
      type: 'bank_accounts'
    },
    'iii': { 
      name: 'Bonds, Debentures & Shares', 
      icon: '📊', 
      color: '#8b5cf6',
      type: 'investments'
    },
    'iv': { 
      name: 'NSS, Postal Savings etc.', 
      icon: '📮', 
      color: '#f59e0b',
      type: 'simple'
    },
    'v': { 
      name: 'Personal Loans Given', 
      icon: '📤', 
      color: '#06b6d4',
      type: 'line_items'
    },
    'vi': { 
      name: 'Motor Vehicles', 
      icon: '🚗', 
      color: '#f59e0b',
      type: 'vehicles'
    },
    'vii': { 
      name: 'Jewellery & Valuables', 
      icon: '💎', 
      color: '#ec4899',
      type: 'valuables'
    },
    'viii': { 
      name: 'Other Assets', 
      icon: '📦', 
      color: '#64748b',
      type: 'line_items'
    }
  };

  // SMART INVESTMENT PARSER - For Bonds, Shares, Mutual Funds
  const parseInvestments = (text) => {
    if (!text || text === 'Nil') return [];
    
    const items = [];
    const lines = text.split('\n').filter(l => l.trim().length > 5);
    
    for (const line of lines) {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join(':').trim();
        
        items.push({ 
          name, 
          value: value.replace(/Rs\s*/i, 'Rs '),
          type: name.toLowerCase().includes('mutual') || name.toLowerCase().includes('fund') ? 'Mutual Fund' :
                name.toLowerCase().includes('share') ? 'Shares' :
                name.toLowerCase().includes('deposit') ? 'Deposit' : 'Investment'
        });
      }
    }
    
    return items;
  };

  // SMART VALUABLES PARSER - For Jewellery with weights
  const parseValuables = (text) => {
    if (!text || text === 'Nil') return [];
    
    const items = [];
    const lines = text.split('\n').filter(l => l.trim().length > 5);
    
    for (const line of lines) {
      const parts = line.split(':');
      const description = parts[0]?.trim() || line;
      const value = parts[1]?.trim() || 'N/A';
      
      // Extract weight if present
      const weightMatch = description.match(/(\d+\.?\d*)\s*(Gm|Kg|gm|kg)/i);
      const weight = weightMatch ? `${weightMatch[1]} ${weightMatch[2]}` : null;
      
      items.push({ description, value, weight });
    }
    
    return items;
  };

  // PROCESS EACH ASSET CATEGORY
  candidateData.movableAssets.forEach((asset, index) => {
    const srNo = asset.srNo?.toLowerCase().trim();
    const config = assetCategoryConfig[srNo];
    
    // Skip if no self data or nil
    if (!asset.self || asset.self === 'Nil' || asset.total === 'Rs 70') {
      console.log(`⏭️ Skipping ${srNo}: No data`);
      return;
    }

    const categoryName = config?.name || asset.description || 'Other Asset';
    const icon = config?.icon || '📋';
    const color = config?.color || '#64748b';
    const type = config?.type || 'line_items';

    console.log(`✅ Rendering: ${categoryName} (${type})`);

    // ========================================
    // RENDER BASED ON TYPE
    // ========================================

    if (type === 'simple') {
      // Simple amount display (Cash, NSS, etc.)
      detailsHTML += `
        <div class="details-section reveal">
          <div class="summary-card">
            <div class="summary-card-title">${icon} ${escapeHtml(categoryName)}</div>
            <div class="asset-card" style="text-align: center; padding: 30px;">
              <div style="font-size: 3em; margin-bottom: 15px;">${icon}</div>
              <div class="amount-large" style="color: ${color};">${formatCurrency(asset.self)}</div>
              ${asset.spouse && asset.spouse !== 'Nil' ? `
                <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
                  <div style="color: #64748b; font-weight: 600; margin-bottom: 8px;">Spouse</div>
                  <div class="amount-large" style="font-size: 1.3em; color: ${color};">${formatCurrency(asset.spouse)}</div>
                </div>
              ` : ''}
              ${asset.total && asset.total !== 'Nil' && asset.total !== 'Rs 70' ? `
                <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 10px;">
                  <div style="font-size: 0.9em; color: #0369a1; font-weight: 700; margin-bottom: 5px;">TOTAL</div>
                  <div style="font-size: 1.8em; font-weight: 900; color: ${color};">${formatCurrency(asset.total)}</div>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }

    else if (type === 'bank_accounts') {
      // Bank accounts with detailed parsing
      const accounts = parseBankAccounts(asset.self);
      const spouseAccounts = asset.spouse && asset.spouse !== 'Nil' ? parseBankAccounts(asset.spouse) : [];
      
      if (accounts.length > 0 || spouseAccounts.length > 0) {
        detailsHTML += `
          <div class="details-section reveal">
            <div class="summary-card">
              <div class="summary-card-title">${icon} ${escapeHtml(categoryName)} (${accounts.length + spouseAccounts.length})</div>
              
              ${accounts.length > 0 ? `
                <div style="margin-bottom: ${spouseAccounts.length > 0 ? '30px' : '0'};">
                  <div style="font-weight: 700; color: #1e293b; margin-bottom: 15px; padding: 10px; background: #f8fafc; border-radius: 8px;">
                    👤 Self (${accounts.length})
                  </div>
                  <div style="overflow-x: auto;">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Bank</th>
                          <th>Branch</th>
                          <th>Account Number</th>
                          <th>Type</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${accounts.map((acc, idx) => `
                          <tr>
                            <td><strong>${idx + 1}</strong></td>
                            <td><span class="badge badge-info">${safeText(acc.bank)}</span></td>
                            <td>${safeText(acc.branch)}</td>
                            <td><code>${safeText(acc.accountNo)}</code></td>
                            <td><span class="badge ${acc.type === 'Fixed Deposit' ? 'badge-success' : 'badge-purple'}">${safeText(acc.type)}</span></td>
                            <td><strong>${formatCurrency(acc.amount)}</strong></td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              ` : ''}
              
              ${spouseAccounts.length > 0 ? `
                <div>
                  <div style="font-weight: 700; color: #1e293b; margin-bottom: 15px; padding: 10px; background: #fef3c7; border-radius: 8px;">
                    👰 Spouse (${spouseAccounts.length})
                  </div>
                  <div style="overflow-x: auto;">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Bank</th>
                          <th>Branch</th>
                          <th>Account Number</th>
                          <th>Type</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${spouseAccounts.map((acc, idx) => `
                          <tr>
                            <td><strong>${idx + 1}</strong></td>
                            <td><span class="badge badge-info">${safeText(acc.bank)}</span></td>
                            <td>${safeText(acc.branch)}</td>
                            <td><code>${safeText(acc.accountNo)}</code></td>
                            <td><span class="badge ${acc.type === 'Fixed Deposit' ? 'badge-success' : 'badge-purple'}">${safeText(acc.type)}</span></td>
                            <td><strong>${formatCurrency(acc.amount)}</strong></td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              ` : ''}
              
              ${asset.total && asset.total !== 'Nil' ? `
                <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 10px; text-align: center;">
                  <div style="font-size: 0.9em; color: #0369a1; font-weight: 700; margin-bottom: 5px;">TOTAL DEPOSITS</div>
                  <div style="font-size: 2em; font-weight: 900; color: ${color};">${formatCurrency(asset.total)}</div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }
    }

    else if (type === 'investments') {
      // Bonds, Shares, Mutual Funds
      const investments = parseInvestments(asset.self);
      
      if (investments.length > 0) {
        detailsHTML += `
          <div class="details-section reveal">
            <div class="summary-card">
              <div class="summary-card-title">${icon} ${escapeHtml(categoryName)} (${investments.length})</div>
              <div class="grid-2">
                ${investments.map((inv, idx) => `
                  <div class="card-item" style="border-left: 4px solid ${color}; background: linear-gradient(135deg, #faf5ff, #f3e8ff);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                      <strong style="color: #581c87; font-size: 0.95em;">Investment ${idx + 1}</strong>
                      <span class="badge badge-purple">${escapeHtml(inv.type)}</span>
                    </div>
                    <div class="data-row">
                      <div class="data-label">Fund/Security Name</div>
                      <div class="data-value" style="font-weight: 700; color: #6b21a8;">${safeText(inv.name)}</div>
                    </div>
                    <div class="data-row">
                      <div class="data-label">Current Value</div>
                      <div class="amount-large" style="color: ${color};">${formatCurrency(inv.value)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
              ${asset.total && asset.total !== 'Nil' ? `
                <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #faf5ff, #f3e8ff); border-radius: 10px; text-align: center;">
                  <div style="font-size: 0.9em; color: #6b21a8; font-weight: 700; margin-bottom: 5px;">TOTAL INVESTMENT VALUE</div>
                  <div style="font-size: 2em; font-weight: 900; color: ${color};">${formatCurrency(asset.total)}</div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }
    }

    else if (type === 'vehicles') {
      // Motor Vehicles
      const vehicles = parseVehicles(asset.self);
      
      if (vehicles.length > 0) {
        detailsHTML += `
          <div class="details-section reveal">
            <div class="summary-card">
              <div class="summary-card-title">${icon} ${escapeHtml(categoryName)} (${vehicles.length})</div>
              <div class="grid-2">
                ${vehicles.map((v, idx) => `
                  <div class="card-item vehicle">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                      <div>
                        <div style="font-size: 1.4em; font-weight: 900; color: #d97706; margin-bottom: 5px;">
                          ${safeText(v.make)} ${safeText(v.model)}
                        </div>
                        <div style="font-size: 0.9em; color: #78716c;">
                          ${v.year ? `Year: ${safeText(v.year)}` : ''}
                        </div>
                      </div>
                      <div style="font-size: 2em;">🚘</div>
                    </div>
                    ${v.registration ? `
                      <div style="margin: 10px 0;">
                        <span class="badge badge-warning">${safeText(v.registration)}</span>
                      </div>
                    ` : ''}
                    <div style="font-size: 1.3em; font-weight: 800; color: #92400e; margin-top: 10px;">
                      ${formatCurrency(v.amount)}
                    </div>
                  </div>
                `).join('')}
              </div>
              ${asset.total && asset.total !== 'Nil' ? `
                <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #fffbeb, #fef3c7); border-radius: 10px; text-align: center;">
                  <div style="font-size: 0.9em; color: #92400e; font-weight: 700; margin-bottom: 5px;">TOTAL VEHICLE VALUE</div>
                  <div style="font-size: 2em; font-weight: 900; color: ${color};">${formatCurrency(asset.total)}</div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }
    }

    else if (type === 'valuables') {
      const items = parseValuables(asset.self);
      const spouseItems = asset.spouse && asset.spouse !== 'Nil' ? parseValuables(asset.spouse) : [];
      
      if (items.length > 0 || spouseItems.length > 0) {
        detailsHTML += `
          <div class="details-section reveal">
            <div class="summary-card">
              <div class="summary-card-title">${icon} ${escapeHtml(categoryName)}</div>
              
              ${items.length > 0 ? `
                <div class="card-item jewellery" style="margin-bottom: ${spouseItems.length > 0 ? '20px' : '0'};">
                  <div style="font-size: 2em; text-align: center; margin-bottom: 15px;">💍</div>
                  <div style="font-weight: 700; color: #831843; margin-bottom: 15px; padding: 10px; background: #fdf2f8; border-radius: 8px; text-align: center;">
                    👤 Self
                  </div>
                  ${items.map(item => `
                    <div class="data-row">
                      <div class="data-label">
                        ${safeText(item.description)}
                        ${item.weight ? `<br><span style="font-size: 0.85em; color: #9ca3af;">(${item.weight})</span>` : ''}
                      </div>
                      <div class="data-value" style="font-weight: 800; color: #be185d;">${formatCurrency(item.value)}</div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              ${spouseItems.length > 0 ? `
                <div class="card-item jewellery">
                  <div style="font-size: 2em; text-align: center; margin-bottom: 15px;">💎</div>
                  <div style="font-weight: 700; color: #831843; margin-bottom: 15px; padding: 10px; background: #fef3c7; border-radius: 8px; text-align: center;">
                    👰 Spouse
                  </div>
                  ${spouseItems.map(item => `
                    <div class="data-row">
                      <div class="data-label">
                        ${safeText(item.description)}
                        ${item.weight ? `<br><span style="font-size: 0.85em; color: #9ca3af;">(${item.weight})</span>` : ''}
                      </div>
                      <div class="data-value" style="font-weight: 800; color: #be185d;">${formatCurrency(item.value)}</div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
              
              ${asset.total && asset.total !== 'Nil' ? `
                <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #fdf2f8, #fce7f3); border-radius: 10px; text-align: center;">
                  <div style="font-size: 0.9em; color: #831843; font-weight: 700; margin-bottom: 5px;">TOTAL VALUE</div>
                  <div style="font-size: 2em; font-weight: 900; color: ${color};">${formatCurrency(asset.total)}</div>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }
    }

    else if (type === 'line_items') {
      const items = parseSimpleList(asset.self);
      
      if (items.length > 0) {
        detailsHTML += `
          <div class="details-section reveal">
            <div class="summary-card">
              <div class="summary-card-title">${icon} ${escapeHtml(categoryName)}</div>
              <div class="card-item" style="border-left: 4px solid ${color};">
                ${items.map(item => `
                  <div class="data-row">
                    <div class="data-label">${safeText(item.description)}</div>
                    <div class="data-value" style="font-weight: 800; color: ${color};">${formatCurrency(item.amount)}</div>
                  </div>
                `).join('')}
                ${asset.total && asset.total !== 'Nil' && asset.total !== 'Rs 70' ? `
                  <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e2e8f0; text-align: center;">
                    <div style="font-size: 0.9em; color: #64748b; font-weight: 700; margin-bottom: 5px;">TOTAL</div>
                    <div style="font-size: 1.8em; font-weight: 900; color: ${color};">${formatCurrency(asset.total)}</div>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }
    }
  });

  console.log('✅ All movable assets rendered dynamically!');
}

    // ========================================
    // IMMOVABLE ASSETS - DETAILED PROPERTIES
    // ========================================
   // ========================================
// IMMOVABLE ASSETS - COMPLETE WITH SPOUSE
// ========================================
if (candidateData.immovableAssets && Array.isArray(candidateData.immovableAssets)) {
  const hasAnyImmovableAssets = candidateData.immovableAssets.some(a => 
    (a.self && a.self !== 'Nil') || 
    (a.spouse && a.spouse !== 'Nil') ||
    (a.total && a.total !== 'Nil' && a.total !== 'Rs 70')
  );

  if (hasAnyImmovableAssets) {
    detailsHTML += `
      <div class="section-header-main reveal">
        <h2><span class="icon">🏠</span>Immovable Assets</h2>
      </div>
    `;

    candidateData.immovableAssets.forEach(asset => {
      // Skip if no real data
      if ((!asset.self || asset.self === 'Nil') && 
          (!asset.spouse || asset.spouse === 'Nil') &&
          (!asset.total || asset.total === 'Nil' || asset.total === 'Rs 70')) {
        return;
      }

      const categoryName = asset.description || 'Property';
      let icon = '🏘️';
      
      if (categoryName.toLowerCase().includes('agricultural')) icon = '🌾';
      else if (categoryName.toLowerCase().includes('residential')) icon = '🏠';
      else if (categoryName.toLowerCase().includes('commercial')) icon = '🏢';
      else if (categoryName.toLowerCase().includes('non agricultural')) icon = '🏞️';

      const selfProperties = parseProperty(asset.self);
      const spouseProperties = parseProperty(asset.spouse);

      detailsHTML += `
        <div class="details-section reveal">
          <div class="summary-card">
            <div class="summary-card-title">${icon} ${escapeHtml(categoryName)}</div>
            
            ${selfProperties.length > 0 ? `
              <div style="margin-bottom: ${spouseProperties.length > 0 ? '25px' : '0'};">
                <div style="font-weight: 700; color: #1e293b; margin-bottom: 15px; padding: 10px; background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: 8px; border-left: 4px solid #10b981;">
                  👤 Self (${selfProperties.length} ${selfProperties.length === 1 ? 'Property' : 'Properties'})
                </div>
                <div class="grid-2">
                  ${selfProperties.map((p, idx) => `
                    <div class="card-item property">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <strong style="color: #065f46;">Property ${idx + 1}</strong>
                        <span style="font-size: 1.5em;">${icon}</span>
                      </div>
                      <div class="data-row">
                        <div class="data-label">📍 Location</div>
                        <div class="data-value" style="font-size: 0.95em; line-height: 1.5;">${safeText(p.address)}</div>
                      </div>
                      ${p.area ? `
                        <div class="data-row">
                          <div class="data-label">📏 Area</div>
                          <div class="data-value"><span class="badge badge-success">${safeText(p.area)}</span></div>
                        </div>
                      ` : ''}
                      <div class="data-row">
                        <div class="data-label">💰 Value</div>
                        <div class="amount-large">${formatCurrency(p.value)}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${spouseProperties.length > 0 ? `
              <div>
                <div style="font-weight: 700; color: #1e293b; margin-bottom: 15px; padding: 10px; background: linear-gradient(135deg, #fffbeb, #fef3c7); border-radius: 8px; border-left: 4px solid #f59e0b;">
                  👰 Spouse (${spouseProperties.length} ${spouseProperties.length === 1 ? 'Property' : 'Properties'})
                </div>
                <div class="grid-2">
                  ${spouseProperties.map((p, idx) => `
                    <div class="card-item property" style="border-left-color: #f59e0b;">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <strong style="color: #92400e;">Property ${idx + 1}</strong>
                        <span style="font-size: 1.5em;">${icon}</span>
                      </div>
                      <div class="data-row">
                        <div class="data-label">📍 Location</div>
                        <div class="data-value" style="font-size: 0.95em; line-height: 1.5;">${safeText(p.address)}</div>
                      </div>
                      ${p.area ? `
                        <div class="data-row">
                          <div class="data-label">📏 Area</div>
                          <div class="data-value"><span class="badge badge-warning">${safeText(p.area)}</span></div>
                        </div>
                      ` : ''}
                      <div class="data-row">
                        <div class="data-label">💰 Value</div>
                        <div class="amount-large" style="color: #d97706;">${formatCurrency(p.value)}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
            
            ${asset.total && asset.total !== 'Nil' && asset.total !== 'Rs 70' ? `
              <div style="margin-top: 25px; padding: 18px; background: linear-gradient(135deg, #f0f9ff, #e0f2fe); border-radius: 12px; text-align: center; border: 2px solid #0ea5e9;">
                <div style="font-size: 0.95em; color: #0369a1; font-weight: 700; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">
                  Total ${escapeHtml(categoryName)} Value
                </div>
                <div style="font-size: 2.2em; font-weight: 900; background: linear-gradient(135deg, #0ea5e9, #0369a1); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                  ${formatCurrency(asset.total)}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });
  }
}

    // ========================================
// SOURCES OF INCOME
// ========================================
if (candidateData.sourcesOfIncome) {
  const hasIncomeData = candidateData.sourcesOfIncome.self || 
                        candidateData.sourcesOfIncome.spouse || 
                        candidateData.sourcesOfIncome.dependent;
  
  if (hasIncomeData) {
    detailsHTML += `
      <div class="details-section reveal">
        <div class="summary-card">
          <div class="summary-card-title">💰 Sources of Income</div>
          <div class="grid-2">
            ${candidateData.sourcesOfIncome.self && candidateData.sourcesOfIncome.self !== 'NA' ? `
              <div class="card-item" style="border-left: 4px solid #10b981;">
                <div style="font-weight: 700; color: #065f46; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.3em;">👤</span>
                  Self
                </div>
                <div class="data-value" style="font-size: 1.05em; line-height: 1.6; color: #1e293b;">
                  ${safeText(candidateData.sourcesOfIncome.self)}
                </div>
              </div>
            ` : ''}
            
            ${candidateData.sourcesOfIncome.spouse && candidateData.sourcesOfIncome.spouse !== 'NA' ? `
              <div class="card-item" style="border-left: 4px solid #3b82f6;">
                <div style="font-weight: 700; color: #1e40af; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.3em;">👰</span>
                  Spouse
                </div>
                <div class="data-value" style="font-size: 1.05em; line-height: 1.6; color: #1e293b;">
                  ${safeText(candidateData.sourcesOfIncome.spouse)}
                </div>
              </div>
            ` : ''}
            
            ${candidateData.sourcesOfIncome.dependent && candidateData.sourcesOfIncome.dependent !== 'NA' ? `
              <div class="card-item" style="border-left: 4px solid #ec4899;">
                <div style="font-weight: 700; color: #831843; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.3em;">👶</span>
                  Dependent
                </div>
                <div class="data-value" style="font-size: 1.05em; line-height: 1.6; color: #1e293b;">
                  ${safeText(candidateData.sourcesOfIncome.dependent)}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
}
    

    // ========================================
    // LIABILITIES - DETAILED LOANS
    // ========================================
   // ========================================
// LIABILITIES - SHOW ALL CATEGORIES
// ========================================
if (candidateData.liabilities && Array.isArray(candidateData.liabilities)) {
  const hasAnyLiabilities = candidateData.liabilities.some(l => 
    (l.self && l.self !== 'Nil') || 
    (l.spouse && l.spouse !== 'Nil') ||
    (l.total && l.total !== 'Nil' && l.total !== 'Rs 70')
  );

  if (hasAnyLiabilities) {
    detailsHTML += `
      <div class="section-header-main reveal">
        <h2><span class="icon">💳</span>Liabilities</h2>
      </div>
    `;

    candidateData.liabilities.forEach((liability, index) => {
      // Skip if completely empty
      if ((!liability.self || liability.self === 'Nil') && 
          (!liability.spouse || liability.spouse === 'Nil') &&
          (!liability.total || liability.total === 'Nil' || liability.total === 'Rs 70')) {
        return;
      }

      const categoryName = liability.description || 'Liability';
      const icon = categoryName.toLowerCase().includes('loan') ? '🏦' : 
                   categoryName.toLowerCase().includes('dues') ? '🏛️' : 
                   categoryName.toLowerCase().includes('dispute') ? '⚖️' : '💳';

      const parsedLoans = liability.self && liability.self !== 'Nil' ? parseLoans(liability.self) : [];
      const spouseLoans = liability.spouse && liability.spouse !== 'Nil' ? parseLoans(liability.spouse) : [];

      detailsHTML += `
        <div class="details-section reveal">
          <div class="summary-card">
            <div class="summary-card-title">${icon} ${escapeHtml(categoryName)}</div>
      `;

      // If has structured loan data
      if (parsedLoans.length > 0 || spouseLoans.length > 0) {
        detailsHTML += `
          ${parsedLoans.length > 0 ? `
            <div style="margin-bottom: ${spouseLoans.length > 0 ? '20px' : '0'};">
              <div style="font-weight: 700; color: #991b1b; margin-bottom: 12px; padding: 8px; background: #fef2f2; border-radius: 6px;">
                👤 Self
              </div>
              <div style="overflow-x: auto;">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Lender</th>
                      <th>Type</th>
                      <th>Account Number</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${parsedLoans.map((loan, idx) => `
                      <tr>
                        <td><strong>${idx + 1}</strong></td>
                        <td><span class="badge badge-info">${safeText(loan.lender)}</span></td>
                        <td><span class="badge badge-warning">${safeText(loan.type)}</span></td>
                        <td><code>${safeText(loan.accountNo)}</code></td>
                        <td><strong style="color: #dc2626;">${formatCurrency(loan.amount)}</strong></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}
          
          ${spouseLoans.length > 0 ? `
            <div>
              <div style="font-weight: 700; color: #991b1b; margin-bottom: 12px; padding: 8px; background: #fef2f2; border-radius: 6px;">
                👰 Spouse
              </div>
              <div style="overflow-x: auto;">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Lender</th>
                      <th>Type</th>
                      <th>Account Number</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${spouseLoans.map((loan, idx) => `
                      <tr>
                        <td><strong>${idx + 1}</strong></td>
                        <td><span class="badge badge-info">${safeText(loan.lender)}</span></td>
                        <td><span class="badge badge-warning">${safeText(loan.type)}</span></td>
                        <td><code>${safeText(loan.accountNo)}</code></td>
                        <td><strong style="color: #dc2626;">${formatCurrency(loan.amount)}</strong></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
          ` : ''}
        `;
      } else {
        // Simple display for Nil/descriptive liabilities
        detailsHTML += `
          <div class="card-item" style="text-align: center; padding: 30px; background: linear-gradient(135deg, #f0fdf4, #dcfce7);">
            <div style="font-size: 3em; margin-bottom: 10px;">✅</div>
            <div style="font-size: 1.2em; font-weight: 700; color: #166534; margin-bottom: 8px;">
              No ${escapeHtml(categoryName)}
            </div>
            <div style="color: #15803d; font-size: 0.95em;">
              ${liability.self === 'Nil' && liability.spouse === 'Nil' ? 'No liabilities reported in this category' : ''}
            </div>
          </div>
        `;
      }

      // Total section
      if (liability.total && liability.total !== 'Nil' && liability.total !== 'Rs 70') {
        detailsHTML += `
          <div style="margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #fef2f2, #fee2e2); border-radius: 10px; text-align: center; border: 2px solid #ef4444;">
            <div style="font-size: 0.9em; color: #991b1b; font-weight: 700; margin-bottom: 5px; text-transform: uppercase;">
              Total Liability
            </div>
            <div style="font-size: 2em; font-weight: 900; background: linear-gradient(135deg, #ef4444, #dc2626); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              ${formatCurrency(liability.total)}
            </div>
          </div>
        `;
      }

      detailsHTML += `
          </div>
        </div>
      `;
    });

    // No liabilities message if all are Nil
  } else {
    detailsHTML += `
      <div class="section-header-main reveal">
        <h2><span class="icon">💳</span>Liabilities</h2>
      </div>
      <div class="details-section reveal">
        <div class="summary-card" style="background: linear-gradient(135deg, #f0fdf4, #dcfce7);">
          <div style="text-align: center; padding: 50px;">
            <div style="font-size: 5em; margin-bottom: 20px;">✅</div>
            <div style="font-size: 1.5em; font-weight: 800; color: #166534; margin-bottom: 10px;">
              No Liabilities Declared
            </div>
            <div style="color: #15803d; font-size: 1.1em;">
              Clean financial record - No loans or dues reported
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
// ========================================
// PROFESSIONS
// ========================================
if (candidateData.professions) {
  const hasProfessionData = candidateData.professions.self || candidateData.professions.spouse;
  
  if (hasProfessionData) {
    detailsHTML += `
      <div class="details-section reveal">
        <div class="summary-card">
          <div class="summary-card-title">💼 Professions</div>
          <div class="grid-2">
            ${candidateData.professions.self ? `
              <div class="card-item" style="border-left: 4px solid #7c3aed;">
                <div style="font-weight: 700; color: #5b21b6; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.3em;">👤</span>
                  Self
                </div>
                <div class="data-value" style="font-size: 1.05em; line-height: 1.6; color: #1e293b;">
                  ${safeText(candidateData.professions.self)}
                </div>
              </div>
            ` : ''}
            
            ${candidateData.professions.spouse ? `
              <div class="card-item" style="border-left: 4px solid #f59e0b;">
                <div style="font-weight: 700; color: #92400e; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 1.3em;">👰</span>
                  Spouse
                </div>
                <div class="data-value" style="font-size: 1.05em; line-height: 1.6; color: #1e293b;">
                  ${safeText(candidateData.professions.spouse)}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }
}

// ========================================
// OTHER ELECTIONS - HISTORICAL DATA
// ========================================
if (candidateData.otherElections && Array.isArray(candidateData.otherElections) && candidateData.otherElections.length > 0) {
  detailsHTML += `
    <div class="section-header-main reveal">
      <h2><span class="icon">🗳️</span>Electoral History</h2>
    </div>
    <div class="details-section reveal">
      <div class="summary-card">
        <div class="summary-card-title">📊 Past Elections Contested (${candidateData.otherElections.length})</div>
        <div style="overflow-x: auto;">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Election</th>
                <th>Declared Assets</th>
                <th>Criminal Cases</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              ${candidateData.otherElections.map((election, idx) => {
                const assetMatch = election.declaredAssets?.match(/Rs\s*([\d,]+)/);
                const assetAmount = assetMatch ? parseInt(assetMatch[1].replace(/,/g, '')) : 0;
                const prevAssetMatch = idx < candidateData.otherElections.length - 1 ? 
                  candidateData.otherElections[idx + 1].declaredAssets?.match(/Rs\s*([\d,]+)/) : null;
                const prevAmount = prevAssetMatch ? parseInt(prevAssetMatch[1].replace(/,/g, '')) : 0;
                
                const trend = idx < candidateData.otherElections.length - 1 ? 
                  (assetAmount > prevAmount ? '📈 Increased' : 
                   assetAmount < prevAmount ? '📉 Decreased' : '➡️ Same') : 
                  '—';
                
                const casesColor = election.declaredCases > 0 ? '#dc2626' : '#10b981';
                
                return `
                  <tr>
                    <td><strong>${idx + 1}</strong></td>
                    <td>
                      <span class="badge badge-info">${safeText(election.declarationIn)}</span>
                    </td>
                    <td>
                      <strong style="color: #7c3aed; font-size: 1.1em;">
                        ${safeText(election.declaredAssets)}
                      </strong>
                    </td>
                    <td>
                      <span class="badge ${election.declaredCases > 0 ? 'badge-danger' : 'badge-success'}">
                        ${election.declaredCases} ${election.declaredCases === 1 ? 'Case' : 'Cases'}
                      </span>
                    </td>
                    <td>${trend}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
    // ========================================
    // ASSET SUMMARY
    // ========================================
    if (candidateData.summary) {
      detailsHTML += `
        <div class="section-header-main reveal">
          <h2><span class="icon">📊</span>Financial Summary</h2>
        </div>
        <div class="details-section reveal">
          <div class="summary-card" style="background: linear-gradient(135deg, #fffbeb, #fef3c7);">
            <div class="asset-summary">
              <div class="asset-card">
                <div style="font-size: 2.5em; margin-bottom: 10px;">💰</div>
                <div class="asset-card-title">Total Assets</div>
                <div class="asset-card-value">${formatCurrency(candidateData.summary.totalAssets)}</div>
              </div>
              <div class="asset-card">
                <div style="font-size: 2.5em; margin-bottom: 10px;">💳</div>
                <div class="asset-card-title">Total Liabilities</div>
                <div class="asset-card-value" style="background: linear-gradient(135deg, #ef4444, #dc2626); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                  ${formatCurrency(candidateData.summary.totalLiabilities)}
                </div>
              </div>
              <div class="asset-card" style="border-color: #10b981;">
                <div style="font-size: 2.5em; margin-bottom: 10px;">📊</div>
                <div class="asset-card-title">Net Worth</div>
                <div class="asset-card-value" style="background: linear-gradient(135deg, #10b981, #059669); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                  ${formatCurrency('Rs ' + (totalAssets - totalLiabilities))}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // ========================================
  // HEADER INFO GRID
  // ========================================
  const infoItems = [];

  if (data.state !== 'N/A' && data.state !== 'Unknown') {
    infoItems.push(`
      <div class="info-item">
        <div class="info-label">📍 State</div>
        <div class="info-value">${escapeHtml(data.state)}</div>
      </div>
    `);
  }

  if (data.age !== 'N/A') {
    const ageDisplay = typeof data.age === 'number' ? `${data.age} years` : String(data.age).includes('year') ? data.age : `${data.age} years`;
    
    infoItems.push(`
      <div class="info-item">
        <div class="info-label">🎂 Age</div>
        <div class="info-value" data-field="age">${escapeHtml(ageDisplay)}</div>
      </div>
    `);
  }

 if (data.education !== 'N/A') {
  infoItems.push(`
    <div class="info-item" style="grid-column: 1 ;">
      <div class="info-label">🎓 Education</div>
      <div class="info-value" data-field="education" style="line-height: 1.6;">${escapeHtml(data.education)}</div>
    </div>
  `);

}

  if (data.gender !== 'N/A') {
    infoItems.push(`
      <div class="info-item">
        <div class="info-label">👤 Gender</div>
        <div class="info-value" data-field="gender">${escapeHtml(data.gender)}</div>
      </div>
    `);
  }

  if (data.termStart !== 'N/A') {
    infoItems.push(`
      <div class="info-item">
        <div class="info-label">📅 Term Start</div>
        <div class="info-value">${escapeHtml(data.termStart)}</div>
      </div>
    `);
  }

  if (data.termEnd !== 'N/A') {
    infoItems.push(`
      <div class="info-item">
        <div class="info-label">📅 Term End</div>
        <div class="info-value">${escapeHtml(data.termEnd)}</div>
      </div>
    `);
  }

  document.getElementById('content').innerHTML = `
    <div class="header-card">
      <div class="header-content">
        <div class="profile-section">
          <div class="profile-image-wrapper">
           <img src="${escapeHtml(imageUrl)}" 
     alt="${escapeHtml(data.name)}" 
     class="profile-image" 
     onerror="this.src='https://via.placeholder.com/200/667eea/ffffff?text=${encodeURIComponent(data.name?.charAt(0) || '?')}'">   <div class="verification-badge" title="Verified Profile">✓</div>
          </div>
          <div class="profile-info">
            <h1 class="member-name">${escapeHtml(data.name)}</h1>
            <div class="member-role-section">
              <span class="role-badge">
                <span style="font-size: 1.3em;">🏛️</span>
                <strong>${escapeHtml(data.type)}</strong>
              </span>
              <span class="constituency-badge">
                <span style="font-size: 1.2em;">📍</span>
                ${escapeHtml(data.constituency)}
              </span>
              ${data.party !== 'N/A' && data.party !== 'Unknown' ? `
                <span class="party-badge">
                  <span style="font-size: 1.1em;">🎯</span>
                  ${escapeHtml(data.party)}
                </span>
              ` : ''}
            </div>
            
            ${infoItems.length > 0 ? `<div class="info-grid">${infoItems.join('')}</div>` : ''}
          </div>
        </div>
      </div>
    </div>

    ${quickStatsHTML}
    ${statsHTML}
    ${detailsHTML}
  `;

  console.log('✅ COMPLETE dashboard rendering done with ALL details');

  setTimeout(() => {
    createParticles();
    add3DTilt();
    addSparkles();
    animateCounters();
    revealOnScroll();
  }, 100);
}
    async function loadMemberDataWithLoader() {
      const loader = document.getElementById("loading-screen");
      loader.style.display = "flex";
      
      startLoadingAnimation();
      
      try {
        await loadMemberData();
      } catch (error) {
        console.error('Fatal error:', error);
      } finally {
        setTimeout(() => {
          loader.style.display = "none";
          clearInterval(messageInterval);
        }, 500);
      }
    }

    window.addEventListener("DOMContentLoaded", loadMemberDataWithLoader);