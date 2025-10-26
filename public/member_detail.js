
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
      div.textContent = text;
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
      const blocks = text.split(/\n\n+/).filter(b => b.trim().length > 0);
      
      for (const block of blocks) {
        const parts = block.split('|');
        
        if (parts.length >= 2) {
          const address = parts[0].replace(/\n/g, ' ').trim();
          
          const valuePart = parts.find(p => /Value:/i.test(p));
          let value = 'N/A';
          
          if (valuePart) {
            const valueMatch = valuePart.match(/Rs\s+([\d,]+)/);
            value = valueMatch ? `Rs ${valueMatch[1]}` : 'N/A';
          }
          
          const areaMatch = block.match(/Area:\s*([^|]+)/i);
          const builtMatch = block.match(/Built:\s*([^|]+)/i);
          const inheritedMatch = block.match(/Inherited:\s*(\w+)/i);
          const dateMatch = block.match(/Purchased:\s*([\d-]+)/i);
          
          if (address && address.length > 5) {
            properties.push({
              address,
              value,
              area: areaMatch ? areaMatch[1].trim() : '',
              built: builtMatch ? builtMatch[1].trim() : '',
              inherited: inheritedMatch ? inheritedMatch[1] : '',
              purchaseDate: dateMatch ? dateMatch[1] : ''
            });
          }
        }
      }
      
      console.log(`🏠 Parsed ${properties.length} properties`);
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
      const memberName = params.name;
      const memberType = params.type;
      
      if (!memberName || !memberType) {
        throw new Error('Missing name or type parameter');
      }
      
      currentMemberName = memberName;
      currentMemberType = memberType;

      try {
        const response = await fetch(`/api/prs?name=${encodeURIComponent(memberName)}&type=${encodeURIComponent(memberType)}`);
        const prsData = await response.json();

        if (!prsData.found) throw new Error('Member not found');

        let candidateData = null;
        if (prsData.constituency && prsData.constituency !== 'Unknown') {
          try {
            const candidateResponse = await fetch(
              `/api/candidate?name=${encodeURIComponent(memberName)}&constituency=${encodeURIComponent(prsData.constituency)}&party=${encodeURIComponent(prsData.party)}`
            );
            if (candidateResponse.ok) {
              const rawData = await candidateResponse.json();
              candidateData = rawData.data || rawData;
              currentCandidateData = candidateData;
            }
          } catch (err) {
            console.error('Error fetching candidate data:', err);
          }
        }

        if (memberType === 'MP') {
          renderMPDashboardFromServerData(prsData, candidateData);
        } else {
          renderMLADashboardFromServerData(prsData, candidateData);
        }

      } catch (err) {
        console.error('Error:', err);
        document.getElementById('content').innerHTML = `
          <div class="error-card">
            <div style="font-size: 5em; margin-bottom: 20px;">⚠️</div>
            <div style="font-size: 1.8em; font-weight: 800; color: #e74c3c; margin-bottom: 15px;">Unable to Load Profile</div>
            <div style="color: #64748b; font-size: 1.1em;">${escapeHtml(err.message)}</div>
            <a href="/">← Back to Map</a>
          </div>
        `;
      }
    }
function renderMPDashboardFromServerData(prsData, candidateData) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(prsData.html, 'text/html');

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

      if (prsData.performance) {
        Object.keys(prsData.performance).forEach(key => {
          if (prsData.performance[key]) data[key] = prsData.performance[key];
        });
      }

      if (prsData.personal) {
        if (prsData.personal.age) data.age = prsData.personal.age;
        if (prsData.personal.gender) data.gender = prsData.personal.gender;
        if (prsData.personal.education) data.education = prsData.personal.education;
        if (prsData.personal.termStart) data.termStart = prsData.personal.termStart;
        if (prsData.personal.termEnd) data.termEnd = prsData.personal.termEnd;
        if (prsData.personal.noOfTerm) data.noOfTerm = prsData.personal.noOfTerm;
      }

      if (prsData.html) {
        data.attendanceTable = doc.querySelector('#block-views-mps-attendance-block table')?.outerHTML || '';
        data.debatesTable = doc.querySelector('#block-views-mps-debate-related-views-block table')?.outerHTML || '';
        data.questionsTable = doc.querySelector('#block-views-mp-related-views-block-2222 table')?.outerHTML || '';
      }

      if (candidateData && candidateData.candidate) {
        if (data.age === 'N/A' && candidateData.candidate.age) data.age = candidateData.candidate.age;
        if (data.education === 'N/A' && candidateData.candidate.education) {
          data.education = cleanEducation(candidateData.candidate.education);
        }
      }

      renderDashboard(data, candidateData);
    }

    function renderMLADashboardFromServerData(prsData, candidateData) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(prsData.html, 'text/html');
      
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

      if (prsData.personal) {
        if (prsData.personal.age) data.age = prsData.personal.age;
        if (prsData.personal.gender) data.gender = prsData.personal.gender;
        if (prsData.personal.education) data.education = prsData.personal.education;
        if (prsData.personal.termStart) data.termStart = prsData.personal.termStart;
        if (prsData.personal.termEnd) data.termEnd = prsData.personal.termEnd;
      }

      if (candidateData && candidateData.candidate) {
        if (data.age === 'N/A' && candidateData.candidate.age) data.age = candidateData.candidate.age;
        if (data.education === 'N/A' && candidateData.candidate.education) {
          data.education = cleanEducation(candidateData.candidate.education);
        }
      }

      renderDashboard(data, candidateData);
    }

     function renderDashboard(data, candidateData = null) {
  console.log('🎨 Rendering COMPLETE dashboard with ALL data');
  console.log('data', data);
  console.log("candidate data", candidateData);

  if (candidateData && candidateData.candidate) {
    if (candidateData.candidate.education) {
      candidateData.candidate.education = cleanEducation(candidateData.candidate.education);
    }
  }

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
    if (candidateData.movableAssets && Array.isArray(candidateData.movableAssets)) {
      detailsHTML += `
        <div class="section-header-main reveal">
          <h2><span class="icon">💎</span>Movable Assets</h2>
        </div>
      `;

      const cashAsset = candidateData.movableAssets.find(a => 
        a.description && a.description.toLowerCase().includes('cash')
      );
      
      if (cashAsset && cashAsset.self && cashAsset.self !== 'Nil') {
        detailsHTML += `
          <div class="details-section reveal">
            <div class="summary-card">
              <div class="summary-card-title">💵 Cash in Hand</div>
              <div class="asset-card" style="text-align: center; padding: 30px;">
                <div style="font-size: 3em; margin-bottom: 15px;">💰</div>
                <div class="amount-large">${formatCurrency(cashAsset.self)}</div>
              </div>
            </div>
          </div>
        `;
      }

      const bankAsset = candidateData.movableAssets.find(a => 
        a.description && a.description.toLowerCase().includes('deposits in banks')
      );
      
      if (bankAsset && bankAsset.self && bankAsset.self !== 'Nil') {
        const accounts = parseBankAccounts(bankAsset.self);
        
        if (accounts.length > 0) {
          detailsHTML += `
            <div class="details-section reveal">
              <div class="summary-card">
                <div class="summary-card-title">🏦 Bank Accounts & Fixed Deposits (${accounts.length})</div>
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
            </div>
          `;
        }
      }

      const vehicleAsset = candidateData.movableAssets.find(a => 
        a.description && a.description.toLowerCase().includes('motor vehicles')
      );
      
      if (vehicleAsset && vehicleAsset.self && vehicleAsset.self !== 'Nil') {
        const vehicles = parseVehicles(vehicleAsset.self);
        
        if (vehicles.length > 0) {
          detailsHTML += `
            <div class="details-section reveal">
              <div class="summary-card">
                <div class="summary-card-title">🚗 Motor Vehicles (${vehicles.length})</div>
                <div class="grid-2">
                  ${vehicles.map(v => `
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
              </div>
            </div>
          `;
        }
      }

      const jewelleryAsset = candidateData.movableAssets.find(a => 
        a.description && a.description.toLowerCase().includes('jewellery')
      );
      
      if (jewelleryAsset && jewelleryAsset.self && jewelleryAsset.self !== 'Nil') {
        detailsHTML += `
          <div class="details-section reveal">
            <div class="summary-card">
              <div class="summary-card-title">💎 Jewellery</div>
              <div class="card-item jewellery">
                <div style="font-size: 2.5em; text-align: center; margin-bottom: 15px;">💍</div>
                <div class="data-row">
                  <div class="data-label">Details</div>
                  <div class="data-value">${safeText(jewelleryAsset.self)}</div>
                </div>
                <div class="data-row">
                  <div class="data-label">Total Value</div>
                  <div class="amount-large">${formatCurrency(jewelleryAsset.total)}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      // Insurance Policies
      const insuranceAsset = candidateData.movableAssets.find(a => 
        a.description && (a.description.toLowerCase().includes('lic') || a.description.toLowerCase().includes('insurance'))
      );
      
      if (insuranceAsset && insuranceAsset.total && insuranceAsset.total !== 'Nil' && insuranceAsset.total !== 'Rs 70') {
        detailsHTML += `
          <div class="details-section reveal">
            <div class="summary-card">
              <div class="summary-card-title">🛡️ Insurance Policies</div>
              <div class="card-item insurance">
                <div class="data-row">
                  <div class="data-label">Policy Details</div>
                  <div class="data-value">${safeText(insuranceAsset.description)}</div>
                </div>
                <div class="data-row">
                  <div class="data-label">Total Coverage</div>
                  <div class="amount-large">${formatCurrency(insuranceAsset.total)}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      // Personal Loans Given
      const loansGivenAsset = candidateData.movableAssets.find(a => 
        a.description && a.description.toLowerCase().includes('personal loans')
      );
      
      if (loansGivenAsset && loansGivenAsset.self && loansGivenAsset.self !== 'Nil') {
        detailsHTML += `
          <div class="details-section reveal">
            <div class="summary-card">
              <div class="summary-card-title">📤 Personal Loans Given</div>
              <div class="card-item income">
                <div class="data-row">
                  <div class="data-label">Loan Details</div>
                  <div class="data-value">${safeText(loansGivenAsset.self)}</div>
                </div>
                <div class="data-row">
                  <div class="data-label">Total Amount</div>
                  <div class="amount-large">${formatCurrency(loansGivenAsset.total)}</div>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    }

    // ========================================
    // IMMOVABLE ASSETS - DETAILED PROPERTIES
    // ========================================
    if (candidateData.immovableAssets && Array.isArray(candidateData.immovableAssets)) {
      detailsHTML += `
        <div class="section-header-main reveal">
          <h2><span class="icon">🏠</span>Immovable Assets</h2>
        </div>
      `;

      // Agricultural Land
      const agricLand = candidateData.immovableAssets.find(a => 
        a.description && a.description.toLowerCase().includes('agricultural land')
      );
      
      if (agricLand && agricLand.self && agricLand.self !== 'Nil') {
        const properties = parseProperty(agricLand.self);
        
        if (properties.length > 0) {
          detailsHTML += `
            <div class="details-section reveal">
              <div class="summary-card">
                <div class="summary-card-title">🌾 Agricultural Land (${properties.length})</div>
                <div class="grid-2">
                  ${properties.map((p, idx) => `
                    <div class="card-item property">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <strong style="color: #065f46;">Property ${idx + 1}</strong>
                        <span style="font-size: 1.5em;">🌾</span>
                      </div>
                      <div class="data-row">
                        <div class="data-label">Location</div>
                        <div class="data-value">${safeText(p.address)}</div>
                      </div>
                      ${p.area ? `
                        <div class="data-row">
                          <div class="data-label">Area</div>
                          <div class="data-value">${safeText(p.area)}</div>
                        </div>
                      ` : ''}
                      <div class="data-row">
                        <div class="data-label">Value</div>
                        <div class="amount-large">${formatCurrency(p.value)}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        }
      }

      // Non-Agricultural Land
      const nonAgricLand = candidateData.immovableAssets.find(a => 
        a.description && a.description.toLowerCase().includes('non agricultural land')
      );
      
      if (nonAgricLand && nonAgricLand.self && nonAgricLand.self !== 'Nil') {
        const properties = parseProperty(nonAgricLand.self);
        
        if (properties.length > 0) {
          detailsHTML += `
            <div class="details-section reveal">
              <div class="summary-card">
                <div class="summary-card-title">🏞️ Non-Agricultural Land (${properties.length})</div>
                <div class="grid-2">
                  ${properties.map((p, idx) => `
                    <div class="card-item property">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <strong style="color: #065f46;">Property ${idx + 1}</strong>
                        <span style="font-size: 1.5em;">🏞️</span>
                      </div>
                      <div class="data-row">
                        <div class="data-label">Location</div>
                        <div class="data-value">${safeText(p.address)}</div>
                      </div>
                      <div class="data-row">
                        <div class="data-label">Value</div>
                        <div class="amount-large">${formatCurrency(p.value)}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        }
      }

      // Residential Buildings
      const residential = candidateData.immovableAssets.find(a => 
        a.description && a.description.toLowerCase().includes('residential buildings')
      );
      
      if (residential && residential.self && residential.self !== 'Nil') {
        const properties = parseProperty(residential.self);
        
        if (properties.length > 0) {
          detailsHTML += `
            <div class="details-section reveal">
              <div class="summary-card">
                <div class="summary-card-title">🏘️ Residential Properties (${properties.length})</div>
                <div class="grid-2">
                  ${properties.map((p, idx) => `
                    <div class="card-item property">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <strong style="color: #065f46;">Property ${idx + 1}</strong>
                        <span style="font-size: 1.5em;">🏠</span>
                      </div>
                      <div class="data-row">
                        <div class="data-label">Address</div>
                        <div class="data-value">${safeText(p.address)}</div>
                      </div>
                      ${p.area ? `
                        <div class="data-row">
                          <div class="data-label">Area</div>
                          <div class="data-value">${safeText(p.area)}</div>
                        </div>
                      ` : ''}
                      ${p.built ? `
                        <div class="data-row">
                          <div class="data-label">Built-up Area</div>
                          <div class="data-value">${safeText(p.built)}</div>
                        </div>
                      ` : ''}
                      ${p.purchaseDate ? `
                        <div class="data-row">
                          <div class="data-label">Purchase Date</div>
                          <div class="data-value">${safeText(p.purchaseDate)}</div>
                        </div>
                      ` : ''}
                      <div class="data-row">
                        <div class="data-label">Value</div>
                        <div class="amount-large">${formatCurrency(p.value)}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        }
      }

      // Commercial Buildings
      const commercial = candidateData.immovableAssets.find(a => 
        a.description && a.description.toLowerCase().includes('commercial buildings')
      );
      
      if (commercial && commercial.self && commercial.self !== 'Nil' && commercial.self !== 'Rs 70') {
        const properties = parseProperty(commercial.self);
        
        if (properties.length > 0) {
          detailsHTML += `
            <div class="details-section reveal">
              <div class="summary-card">
                <div class="summary-card-title">🏢 Commercial Properties (${properties.length})</div>
                <div class="grid-2">
                  ${properties.map((p, idx) => `
                    <div class="card-item property">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                        <strong style="color: #065f46;">Property ${idx + 1}</strong>
                        <span style="font-size: 1.5em;">🏢</span>
                      </div>
                      <div class="data-row">
                        <div class="data-label">Address</div>
                        <div class="data-value">${safeText(p.address)}</div>
                      </div>
                      <div class="data-row">
                        <div class="data-label">Value</div>
                        <div class="amount-large">${formatCurrency(p.value)}</div>
                      </div>
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
    // LIABILITIES - DETAILED LOANS
    // ========================================
    if (candidateData.liabilities && Array.isArray(candidateData.liabilities)) {
      const loans = candidateData.liabilities.filter(l => 
        l.description && l.description.toLowerCase().includes('loan') && l.self && l.self !== 'Nil'
      );
      
      if (loans.length > 0) {
        detailsHTML += `
          <div class="section-header-main reveal">
            <h2><span class="icon">💳</span>Liabilities</h2>
          </div>
        `;

        loans.forEach(loanCategory => {
          const parsedLoans = parseLoans(loanCategory.self);
          
          if (parsedLoans.length > 0) {
            detailsHTML += `
              <div class="details-section reveal">
                <div class="summary-card">
                  <div class="summary-card-title">💳 ${safeText(loanCategory.description)}</div>
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
                  <div style="margin-top: 20px; padding: 15px; background: #fef2f2; border-radius: 10px; text-align: center;">
                    <div style="font-size: 0.9em; color: #991b1b; font-weight: 700; margin-bottom: 5px;">TOTAL LIABILITY</div>
                    <div class="amount-large" style="background: linear-gradient(135deg, #ef4444, #dc2626); -webkit-background-clip: text;">
                      ${formatCurrency(loanCategory.total)}
                    </div>
                  </div>
                </div>
              </div>
            `;
          }
        });
      }
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
        <div class="info-value">${escapeHtml(ageDisplay)}</div>
      </div>
    `);
  }

 if (data.education !== 'N/A') {
  infoItems.push(`
    <div class="info-item" style="grid-column: 1 ;">
      <div class="info-label">🎓 Education</div>
      <div class="info-value" style="line-height: 1.6;">${escapeHtml(data.education)}</div>
    </div>
  `);

}

  if (data.gender !== 'N/A') {
    infoItems.push(`
      <div class="info-item">
        <div class="info-label">👤 Gender</div>
        <div class="info-value">${escapeHtml(data.gender)}</div>
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
            <img src="${escapeHtml(data.imageUrl || 'https://via.placeholder.com/200')}" alt="${escapeHtml(data.name)}" class="profile-image" onerror="this.src='https://via.placeholder.com/200'">
            <div class="verification-badge" title="Verified Profile">✓</div>
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