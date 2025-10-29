// PDF Generator for Member Detail Dashboard
// Uses html2pdf.js library for client-side PDF generation

class PDFGenerator {
  static async generate() {
    try {
      // Show loading indicator
      this.showLoading('Generating PDF...');

      // Load html2pdf.js if not already loaded
      await this.loadHtml2Pdf();

      // Get the content to convert
      const content = document.getElementById('content');
      if (!content) {
        throw new Error('Content not found');
      }

      // Configure PDF options
      const options = {
        margin: [10, 10, 10, 10],
        filename: `${this.getMemberName()}_profile.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          removeContainer: true
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        },
        pagebreak: {
          mode: ['avoid-all', 'css', 'legacy']
        }
      };

      // Generate PDF
      await html2pdf().set(options).from(content).save();

      this.hideLoading();
      this.showSuccess('PDF generated successfully!');

    } catch (error) {
      console.error('PDF Generation Error:', error);
      this.hideLoading();
      this.showError('Failed to generate PDF: ' + error.message);
    }
  }

  static async loadHtml2Pdf() {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.html2pdf) {
        resolve();
        return;
      }

      // Load html2pdf.js from CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load html2pdf.js'));
      document.head.appendChild(script);
    });
  }

  static getMemberName() {
    const memberName = document.querySelector('.member-name');
    if (memberName) {
      return memberName.textContent.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    }
    return 'member_profile';
  }

  static showLoading(message) {
    this.removeExistingNotifications();

    const notification = document.createElement('div');
    notification.id = 'pdf-notification';
    notification.className = 'pdf-notification loading';
    notification.innerHTML = `
      <div class="notification-content">
        <div class="spinner"></div>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    // Add styles if not already present
    this.addNotificationStyles();
  }

  static showSuccess(message) {
    this.removeExistingNotifications();

    const notification = document.createElement('div');
    notification.id = 'pdf-notification';
    notification.className = 'pdf-notification success';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="icon">✅</span>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);
    this.addNotificationStyles();

    // Auto-hide after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  static showError(message) {
    this.removeExistingNotifications();

    const notification = document.createElement('div');
    notification.id = 'pdf-notification';
    notification.className = 'pdf-notification error';
    notification.innerHTML = `
      <div class="notification-content">
        <span class="icon">❌</span>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);
    this.addNotificationStyles();

    // Auto-hide after 5 seconds for errors
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  static hideLoading() {
    const notification = document.getElementById('pdf-notification');
    if (notification) {
      notification.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }
  }

  static removeExistingNotifications() {
    const existing = document.getElementById('pdf-notification');
    if (existing) {
      existing.remove();
    }
  }

  static addNotificationStyles() {
    if (document.getElementById('pdf-notification-styles')) {
      return; // Already added
    }

    const styles = document.createElement('style');
    styles.id = 'pdf-notification-styles';
    styles.textContent = `
      .pdf-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        min-width: 300px;
        max-width: 500px;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
        backdrop-filter: blur(10px);
      }

      .pdf-notification.loading {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .pdf-notification.success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
      }

      .pdf-notification.error {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
      }

      .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .notification-content .spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        flex-shrink: 0;
      }

      .notification-content .icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Print-specific styles */
      @media print {
        .action-buttons,
        .pdf-notification,
        #loading-screen {
          display: none !important;
        }

        .dashboard-container {
          margin: 0;
          padding: 0;
        }

        body {
          background: white !important;
        }

        .background-particles {
          display: none !important;
        }
      }
    `;

    document.head.appendChild(styles);
  }

  // Utility method to generate PDF with custom options
  static async generateCustom(options = {}) {
    try {
      await this.loadHtml2Pdf();

      const defaultOptions = {
        margin: [10, 10, 10, 10],
        filename: `${this.getMemberName()}_profile.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          removeContainer: true
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        }
      };

      const finalOptions = { ...defaultOptions, ...options };
      const content = document.getElementById('content');

      if (!content) {
        throw new Error('Content not found');
      }

      return await html2pdf().set(finalOptions).from(content).output('blob');
    } catch (error) {
      console.error('Custom PDF Generation Error:', error);
      throw error;
    }
  }
}

// Make it globally available
window.PDFGenerator = PDFGenerator;
