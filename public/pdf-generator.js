
(function() {
  'use strict';

  const PDFConfig = {
    watermark: {
      text: 'OFFICIAL DOCUMENT',
      fontSize: '120pt',
      rotation: -45,
      opacity: 0.05
    },
    header: {
      title: 'MP/MLA Official Profile Report',
      subtitle: 'Government of India - Parliamentary Affairs'
    },
    footer: {
      showPageNumbers: true,
      showTimestamp: true,
      showConfidential: true
    },
    margins: {
      top: '15mm',
      right: '10mm',
      bottom: '15mm',
      left: '10mm'
    }
  };

  const PDFUtils = {
    getFormattedDateTime: function() {
      const now = new Date();
      const dateOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      
      const date = now.toLocaleDateString('en-US', dateOptions);
      const time = now.toLocaleTimeString('en-US', timeOptions);
      
      return {
        date: date,
        time: time,
        full: `${date} at ${time}`,
        iso: now.toISOString()
      };
    },
    generateDocumentId: function() {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      return `DOC-${timestamp}-${random}`.toUpperCase();
    },

    getMemberInfo: function() {
      const memberName = document.querySelector('.member-name')?.textContent || 'Unknown';
      const memberType = document.querySelector('.role-badge strong')?.textContent || 'Unknown';
      const constituency = document.querySelector('.constituency-badge')?.textContent?.replace('📍', '').trim() || 'Unknown';
      const party = document.querySelector('.party-badge')?.textContent?.replace('🎯', '').trim() || 'Unknown';
      
      return {
        name: memberName,
        type: memberType,
        constituency: constituency,
        party: party
      };
    },
    getDocumentStats: function() {
      const tables = document.querySelectorAll('table').length;
      const sections = document.querySelectorAll('.details-section').length;
      const totalAssets = document.querySelector('.quick-stat-item:nth-child(1) .quick-stat-value')?.textContent || 'N/A';
      const criminalCases = document.querySelector('.quick-stat-item:nth-child(6) .quick-stat-value')?.textContent || '0';
      
      return {
        totalTables: tables,
        totalSections: sections,
        totalAssets: totalAssets,
        criminalCases: criminalCases
      };
    }
  };

  const PDFStyleManager = {
    injectPrintStyles: function() {
      const styleId = 'pdf-print-styles';
      
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }

      const styles = `
        @media print {
          /* IMPORTANT: Hide all temporary elements including loading indicator */
          .pdf-temp-element,
          #pdf-loading-indicator,
          .pdf-error-message {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
          }

          /* Enhanced Watermark */
          body::before {
            content: "${PDFConfig.watermark.text}";
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(${PDFConfig.watermark.rotation}deg);
            font-size: ${PDFConfig.watermark.fontSize};
            font-weight: 100;
            color: rgba(0, 0, 0, ${PDFConfig.watermark.opacity});
            z-index: -1;
            white-space: nowrap;
            font-family: 'Inter', sans-serif;
            pointer-events: none;
          }

          /* Additional watermark for security */
          body::after {
            content: attr(data-doc-id);
            position: fixed;
            bottom: 5mm;
            right: 5mm;
            font-size: 8pt;
            color: rgba(0, 0, 0, 0.3);
            font-family: 'Courier New', monospace;
            z-index: 9999;
          }

          /* Page setup */
          @page {
            size: A4;
            margin: ${PDFConfig.margins.top} ${PDFConfig.margins.right} ${PDFConfig.margins.bottom} ${PDFConfig.margins.left};
          }

          @page :first {
            margin-top: 20mm;
          }

          /* Hide action buttons and other non-printable elements */
          .action-buttons,
          .toggle-btn,
          #backToTop,
          .background-particles,
          #loading-screen,
          .verification-badge {
            display: none !important;
          }

          /* Show all collapsed content */
          .collapsible-content {
            display: block !important;
            max-height: none !important;
            opacity: 1 !important;
          }

          /* Confidential stamp - only show if enabled */
          .pdf-confidential-stamp {
            display: ${PDFConfig.footer.showConfidential ? 'block' : 'none'} !important;
            position: fixed;
            top: 5mm;
            right: 5mm;
            padding: 3px 8px;
            border: 2px solid #dc2626;
            color: #dc2626;
            font-weight: bold;
            font-size: 10pt;
            transform: rotate(5deg);
            background: rgba(255, 255, 255, 0.9);
          }

          /* QR Code for verification */
          .pdf-qr-code {
            display: block !important;
            position: fixed;
            bottom: 15mm;
            left: 10mm;
            width: 30mm;
            height: 30mm;
            border: 1px solid #e5e7eb;
            padding: 2mm;
            background: white;
          }

          /* Enhanced page numbers */
          .pdf-page-number::after {
            content: "Page " counter(page) " of " counter(pages);
            position: fixed;
            bottom: 5mm;
            left: 50%;
            transform: translateX(-50%);
            font-size: 9pt;
            color: #6b7280;
          }

          /* PDF Header Section */
          .pdf-header-section {
            display: block !important;
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            border: 2px solid #4c1d95;
            border-radius: 10px;
            background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
            page-break-after: avoid;
          }

          .pdf-header-title {
            font-size: 24pt !important;
            font-weight: 900 !important;
            color: #4c1d95 !important;
            margin-bottom: 10px !important;
          }

          .pdf-header-subtitle {
            font-size: 14pt !important;
            color: #6b7280 !important;
            margin-bottom: 15px !important;
          }

          .pdf-header-info {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 15px !important;
            margin-top: 20px !important;
            padding-top: 15px !important;
            border-top: 1px solid #e5e7eb !important;
          }

          .pdf-header-info-item {
            text-align: left !important;
          }

          .pdf-header-info-label {
            font-size: 10pt !important;
            color: #6b7280 !important;
            font-weight: 600 !important;
            text-transform: uppercase !important;
          }

          .pdf-header-info-value {
            font-size: 11pt !important;
            color: #111827 !important;
            font-weight: 500 !important;
          }

          /* PDF Footer Section */
          .pdf-footer-section {
            display: block !important;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            page-break-before: avoid;
          }

          .pdf-footer-content {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 20px;
          }

          .pdf-footer-item {
            text-align: center;
            padding: 10px;
            background: #f9fafb;
            border-radius: 5px;
          }

          .pdf-footer-label {
            font-size: 9pt;
            color: #6b7280;
            font-weight: 600;
            text-transform: uppercase;
            margin-bottom: 5px;
          }

          .pdf-footer-value {
            font-size: 10pt;
            color: #111827;
            font-weight: 500;
          }

          .pdf-footer-disclaimer {
            text-align: center;
            font-size: 8pt;
            color: #9ca3af;
            margin-top: 15px;
            padding: 10px;
            background: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 5px;
          }

          .pdf-page-number {
            display: block !important;
          }

          /* QR Code Content */
          .pdf-qr-content {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 6pt;
            color: #6b7280;
          }

          .pdf-qr-placeholder {
            width: 20mm;
            height: 20mm;
            border: 1px solid #000;
            margin-bottom: 2mm;
            background: repeating-linear-gradient(
              45deg,
              #000,
              #000 2px,
              #fff 2px,
              #fff 4px
            );
          }
        }

        /* Screen-only styles for loading indicator */
        @media screen {
          #pdf-loading-indicator {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            min-width: 300px;
          }

          .pdf-loader-spinner {
            width: 50px;
            height: 50px;
            border: 5px solid #f3f3f3;
            border-top: 5px solid #667eea;
            border-radius: 50%;
            animation: pdf-spin 1s linear infinite;
            margin: 0 auto 20px;
          }

          @keyframes pdf-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .pdf-loader-text {
            font-size: 16px;
            color: #4c1d95;
            font-weight: 600;
          }

          .pdf-error-message {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #fee2e2;
            color: #991b1b;
            padding: 15px 20px;
            border-radius: 10px;
            border: 1px solid #ef4444;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            z-index: 10000;
            animation: pdf-slide-in 0.3s ease-out;
          }

          @keyframes pdf-slide-in {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        }
      `;

      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.innerHTML = styles;
      document.head.appendChild(styleSheet);
    },

    prepareDocumentForPrint: function() {
     
      const docId = PDFUtils.generateDocumentId();
      document.body.setAttribute('data-doc-id', docId);

      const existingLoader = document.getElementById('pdf-loading-indicator');
      if (existingLoader) {
        existingLoader.remove();
      }

      const errorMessages = document.querySelectorAll('.pdf-error-message');
      errorMessages.forEach(msg => msg.remove());

      document.querySelectorAll('.collapsible-content').forEach(content => {
        content.classList.add('active');
        content.style.maxHeight = 'none';
        content.style.display = 'block';
      });

      document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.style.display = 'none';
      });

      const images = document.querySelectorAll('img');
      const imagePromises = Array.from(images).map(img => {
        return new Promise((resolve) => {
          if (img.complete) {
            resolve();
          } else {
            img.onload = resolve;
            img.onerror = resolve;
          }
        });
      });

      return Promise.all(imagePromises);
    },

    restoreDocumentAfterPrint: function() {
     
      document.querySelectorAll('.collapsible-content').forEach(content => {
        content.classList.remove('active');
        content.style.maxHeight = '';
        content.style.display = '';
      });

      document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.style.display = '';
        btn.textContent = 'Show Details';
      });

      document.body.removeAttribute('data-doc-id');

      const tempElements = document.querySelectorAll('.pdf-temp-element');
      tempElements.forEach(el => el.remove());

      const loader = document.getElementById('pdf-loading-indicator');
      if (loader) {
        loader.remove();
      }
    }
  };

  const PDFContentEnhancer = {
    addPDFHeader: function() {
      const existingHeader = document.querySelector('.pdf-header-section');
      if (existingHeader) {
        existingHeader.remove();
      }

      const dateTime = PDFUtils.getFormattedDateTime();
      const memberInfo = PDFUtils.getMemberInfo();
      const docId = document.body.getAttribute('data-doc-id');

      const headerHTML = `
        <div class="pdf-header-section pdf-temp-element" style="display: none;">
          <div class="pdf-header-title">${PDFConfig.header.title}</div>
          <div class="pdf-header-subtitle">${PDFConfig.header.subtitle}</div>
          <div class="pdf-header-info">
            <div class="pdf-header-info-item">
              <div class="pdf-header-info-label">Member Name</div>
              <div class="pdf-header-info-value">${memberInfo.name}</div>
            </div>
            <div class="pdf-header-info-item">
              <div class="pdf-header-info-label">Position</div>
              <div class="pdf-header-info-value">${memberInfo.type} - ${memberInfo.constituency}</div>
            </div>
            <div class="pdf-header-info-item">
              <div class="pdf-header-info-label">Generated On</div>
              <div class="pdf-header-info-value">${dateTime.full}</div>
            </div>
            <div class="pdf-header-info-item">
              <div class="pdf-header-info-label">Document ID</div>
              <div class="pdf-header-info-value">${docId}</div>
            </div>
          </div>
        </div>
      `;

      const container = document.querySelector('.dashboard-container');
      if (container) {
        container.insertAdjacentHTML('afterbegin', headerHTML);
      }
    },

    addPDFFooter: function() {
      const existingFooter = document.querySelector('.pdf-footer-section');
      if (existingFooter) {
        existingFooter.remove();
      }

      const stats = PDFUtils.getDocumentStats();
      const dateTime = PDFUtils.getFormattedDateTime();

      const footerHTML = `
        <div class="pdf-footer-section pdf-temp-element" style="display: none;">
          <div class="pdf-footer-content">
            <div class="pdf-footer-item">
              <div class="pdf-footer-label">Total Sections</div>
              <div class="pdf-footer-value">${stats.totalSections}</div>
            </div>
            <div class="pdf-footer-item">
              <div class="pdf-footer-label">Total Assets</div>
              <div class="pdf-footer-value">${stats.totalAssets}</div>
            </div>
            <div class="pdf-footer-item">
              <div class="pdf-footer-label">Criminal Cases</div>
              <div class="pdf-footer-value">${stats.criminalCases}</div>
            </div>
          </div>
          <div class="pdf-footer-disclaimer">
            <strong>Disclaimer:</strong> This is a computer-generated document. The information provided is based on publicly available data 
            from official affidavits and parliamentary records. For official verification, please refer to the original sources.
          </div>
          <div class="pdf-page-number"></div>
        </div>
      `;

      const container = document.querySelector('.dashboard-container');
      if (container) {
        container.insertAdjacentHTML('beforeend', footerHTML);
      }
    },

    addConfidentialStamp: function() {
      if (!PDFConfig.footer.showConfidential) return;

      const existingStamp = document.querySelector('.pdf-confidential-stamp');
      if (existingStamp) {
        existingStamp.remove();
      }

      const stampHTML = `
        <div class="pdf-confidential-stamp pdf-temp-element" style="display: none;">
          CONFIDENTIAL
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', stampHTML);
    },

    addQRCode: function() {
      const existingQR = document.querySelector('.pdf-qr-code');
      if (existingQR) {
        existingQR.remove();
      }

      const docId = document.body.getAttribute('data-doc-id');
      const qrHTML = `
        <div class="pdf-qr-code pdf-temp-element" style="display: none;">
          <div class="pdf-qr-content">
            <div class="pdf-qr-placeholder"></div>
            <div>Verify: ${docId}</div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', qrHTML);
    }
  };

  const PDFGenerator = {
    init: function() {
      console.log('🖨️ PDF Generator initialized');
      
      window.addEventListener('beforeprint', this.handleBeforePrint.bind(this));
      window.addEventListener('afterprint', this.handleAfterPrint.bind(this));
    },

    handleBeforePrint: function() {
      console.log('📄 Preparing document for PDF generation...');
      
      const loader = document.getElementById('pdf-loading-indicator');
      if (loader) {
        loader.remove();
      }
      
      PDFStyleManager.injectPrintStyles();
      
      PDFStyleManager.prepareDocumentForPrint();
      
      PDFContentEnhancer.addPDFHeader();
      PDFContentEnhancer.addPDFFooter();
      PDFContentEnhancer.addConfidentialStamp();
      PDFContentEnhancer.addQRCode();
      
      console.log('✅ Document ready for PDF generation');
    },

    handleAfterPrint: function() {
      console.log('🔄 Restoring document after PDF generation...');
      
      setTimeout(() => {
        PDFStyleManager.restoreDocumentAfterPrint();
        console.log('✅ Document restored');
      }, 500);
    },

    generatePDF: async function(options = {}) {
      console.log('🚀 Starting PDF generation with options:', options);
      
      try {
        if (options.watermark) {
          Object.assign(PDFConfig.watermark, options.watermark);
        }
        if (options.header) {
          Object.assign(PDFConfig.header, options.header);
        }
        if (options.footer) {
          Object.assign(PDFConfig.footer, options.footer);
        }
        
        this.showLoadingIndicator();
        
        await PDFStyleManager.prepareDocumentForPrint();
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        this.hideLoadingIndicator();
        await new Promise(resolve => setTimeout(resolve, 100));
        
        window.print();
        
        console.log('✅ PDF generation triggered successfully');
        
        if (typeof gtag !== 'undefined') {
          gtag('event', 'pdf_generated', {
            'member_name': PDFUtils.getMemberInfo().name,
            'member_type': PDFUtils.getMemberInfo().type,
            'document_id': PDFUtils.generateDocumentId()
          });
        }
        
      } catch (error) {
        console.error('❌ Error generating PDF:', error);
        this.hideLoadingIndicator();
        this.showErrorMessage('Failed to generate PDF. Please try again.');
      }
    },

    showLoadingIndicator: function() {
      this.hideLoadingIndicator();
      
      const loader = document.createElement('div');
      loader.id = 'pdf-loading-indicator';
      loader.className = 'pdf-temp-element';
      loader.innerHTML = `
        <div class="pdf-loader-spinner"></div>
        <div class="pdf-loader-text">Preparing PDF...</div>
      `;
      document.body.appendChild(loader);
    },

    hideLoadingIndicator: function() {
      const loader = document.getElementById('pdf-loading-indicator');
      if (loader) {
        loader.remove();
      }
    },

    showErrorMessage: function(message) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'pdf-error-message pdf-temp-element';
      errorDiv.innerHTML = `<strong>Error:</strong> ${message}`;
      document.body.appendChild(errorDiv);
      
      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    },

    exportAPI: function() {
      window.PDFGenerator = {
        generate: this.generatePDF.bind(this),
        init: this.init.bind(this),
        config: PDFConfig,
        utils: PDFUtils
      };
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      PDFGenerator.init();
      PDFGenerator.exportAPI();
    });
  } else {
    PDFGenerator.init();
    PDFGenerator.exportAPI();
  }

})();