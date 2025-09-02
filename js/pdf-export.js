// ChiaCheck - PDF Export System

class PDFExporter {
    constructor() {
        this.jsPDF = null;
        this.pageWidth = 210; // A4 width in mm
        this.pageHeight = 297; // A4 height in mm
        this.margin = 20;
        this.currentY = 0;
        this.lineHeight = 6;
        this.colors = {
            primary: [37, 99, 235], // Blue
            secondary: [100, 116, 139], // Gray
            success: [22, 163, 74], // Green
            error: [220, 38, 38], // Red
            text: [15, 23, 42], // Dark gray
            light: [241, 245, 249] // Light gray
        };
    }
    
    async initialize() {
        if (this.jsPDF) return;
        
        try {
            // Wait for jsPDF to be available
            if (typeof window.jspdf === 'undefined') {
                throw new Error('jsPDF library not loaded');
            }
            
            this.jsPDF = window.jspdf.jsPDF;
            console.log('PDF Exporter initialized');
        } catch (error) {
            console.error('Failed to initialize PDF Exporter:', error);
            throw new Error('PDF export not available');
        }
    }
    
    async exportSession(session, calculations) {
        try {
            await this.initialize();
            
            const doc = new this.jsPDF();
            this.currentY = this.margin;
            
            // Add header
            this.addHeader(doc, session);
            
            // Add session info
            this.addSessionInfo(doc, session);
            
            // Add member and banking info
            if (session.settings?.showBankInfo) {
                this.addBankingInfo(doc, session.members);
            }
            
            // Add expense details
            this.addExpenseDetails(doc, session.members);
            
            // Add calculations
            this.addCalculations(doc, calculations);
            
            // Add payment suggestions
            if (calculations.summary) {
                this.addPaymentSuggestions(doc, calculations);
            }
            
            // Add footer
            this.addFooter(doc);
            
            // Generate filename
            const filename = this.generateFilename(session);
            
            // Save the PDF
            doc.save(filename);
            
            console.log('PDF exported successfully:', filename);
            return true;
            
        } catch (error) {
            console.error('PDF export failed:', error);
            throw new Error('Failed to export PDF: ' + error.message);
        }
    }
    
    addHeader(doc, session) {
        const centerX = this.pageWidth / 2;
        
        // App logo/icon (emoji)
        doc.setFontSize(24);
        doc.text('💰', this.margin, this.currentY + 8);
        
        // App name
        doc.setTextColor(...this.colors.primary);
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('ChiaTienNhau', this.margin + 15, this.currentY + 8);
        
        // Subtitle
        doc.setTextColor(...this.colors.secondary);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Smart Bill Splitting Report', this.margin + 15, this.currentY + 15);
        
        // Date range (right aligned)
        const dateText = this.formatDateRange(session.dateRange);
        doc.setTextColor(...this.colors.text);
        doc.setFontSize(10);
        const dateWidth = doc.getTextWidth(dateText);
        doc.text(dateText, this.pageWidth - this.margin - dateWidth, this.currentY + 8);
        
        // Location (right aligned)
        if (session.location) {
            const locationText = session.location;
            doc.setFontSize(10);
            const locationWidth = doc.getTextWidth(locationText);
            doc.text(locationText, this.pageWidth - this.margin - locationWidth, this.currentY + 15);
        }
        
        this.currentY += 25;
        this.addHorizontalLine(doc);
    }
    
    addSessionInfo(doc, session) {
        this.currentY += 10;
        
        doc.setTextColor(...this.colors.text);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Session Overview', this.margin, this.currentY);
        
        this.currentY += 10;
        
        // Session details in two columns
        const leftCol = this.margin;
        const rightCol = this.pageWidth / 2 + 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Left column
        doc.setFont('helvetica', 'bold');
        doc.text('Location:', leftCol, this.currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(session.location || 'Not specified', leftCol + 20, this.currentY);
        
        // Right column
        doc.setFont('helvetica', 'bold');
        doc.text('Members:', rightCol, this.currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${session.members?.length || 0} people`, rightCol + 20, this.currentY);
        
        this.currentY += 8;
        
        // Second row
        doc.setFont('helvetica', 'bold');
        doc.text('Date:', leftCol, this.currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(this.formatDateRange(session.dateRange), leftCol + 20, this.currentY);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Currency:', rightCol, this.currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(session.settings?.currency || 'VND', rightCol + 20, this.currentY);
        
        this.currentY += 15;
    }
    
    addBankingInfo(doc, members) {
        if (!members || members.length === 0) return;
        
        // Check if any member has banking info
        const hasBank = members.some(m => m.bankInfo && (m.bankInfo.accountNumber || m.bankInfo.bankName));
        if (!hasBank) return;
        
        this.checkPageBreak(doc, 40);
        
        doc.setTextColor(...this.colors.text);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Banking Information', this.margin, this.currentY);
        
        this.currentY += 10;
        
        // Table header
        const tableStartX = this.margin;
        const colWidths = [50, 40, 40, 40];
        const headers = ['Member', 'Bank Name', 'Account Number', 'Account Holder'];
        
        this.addTableHeader(doc, tableStartX, colWidths, headers);
        this.currentY += 8;
        
        // Table rows
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        members.forEach(member => {
            this.checkPageBreak(doc, 8);
            
            const bankInfo = member.bankInfo || {};
            const rowData = [
                member.name || '',
                bankInfo.bankName || '-',
                bankInfo.accountNumber || '-',
                bankInfo.accountHolder || member.name || '-'
            ];
            
            this.addTableRow(doc, tableStartX, colWidths, rowData);
            this.currentY += 6;
        });
        
        this.currentY += 10;
    }
    
    addExpenseDetails(doc, members) {
        if (!members || members.length === 0) return;
        
        this.checkPageBreak(doc, 40);
        
        doc.setTextColor(...this.colors.text);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Expense Details', this.margin, this.currentY);
        
        this.currentY += 10;
        
        members.forEach((member, index) => {
            this.checkPageBreak(doc, 30);
            
            // Member name
            doc.setTextColor(...this.colors.primary);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(`${index + 1}. ${member.name}`, this.margin, this.currentY);
            
            this.currentY += 8;
            
            // Items table
            if (member.items && member.items.length > 0) {
                const tableStartX = this.margin + 10;
                const colWidths = [80, 40];
                const headers = ['Item', 'Price'];
                
                // Mini table header
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...this.colors.secondary);
                
                let currentX = tableStartX;
                headers.forEach((header, i) => {
                    doc.text(header, currentX, this.currentY);
                    currentX += colWidths[i];
                });
                
                this.currentY += 6;
                
                // Items
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...this.colors.text);
                
                let memberTotal = 0;
                member.items.forEach(item => {
                    this.checkPageBreak(doc, 6);
                    
                    const price = window.calculationEngine?.parseExpression(item.price) || 0;
                    memberTotal += price;
                    
                    currentX = tableStartX;
                    doc.text(item.name || 'Unnamed item', currentX, this.currentY);
                    currentX += colWidths[0];
                    doc.text(this.formatCurrency(price), currentX, this.currentY);
                    
                    this.currentY += 5;
                });
                
                // Member subtotal
                doc.setFont('helvetica', 'bold');
                currentX = tableStartX;
                doc.text('Subtotal:', currentX, this.currentY);
                currentX += colWidths[0];
                doc.text(this.formatCurrency(memberTotal), currentX, this.currentY);
                
                this.currentY += 8;
            } else {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(...this.colors.secondary);
                doc.text('No items added', this.margin + 10, this.currentY);
                this.currentY += 8;
            }
            
            // Advance payment
            const advance = window.calculationEngine?.parseExpression(member.advance) || 0;
            if (advance > 0) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...this.colors.text);
                doc.text(`Advance Payment: ${this.formatCurrency(advance)}`, this.margin + 10, this.currentY);
                this.currentY += 6;
            }
            
            this.currentY += 5;
        });
    }
    
    addCalculations(doc, calculations) {
        if (!calculations || !calculations.totals) return;
        
        this.checkPageBreak(doc, 60);
        
        doc.setTextColor(...this.colors.text);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Financial Summary', this.margin, this.currentY);
        
        this.currentY += 10;
        
        const totals = calculations.totals;
        
        // Summary box
        const boxStartX = this.margin;
        const boxWidth = this.pageWidth - (2 * this.margin);
        const boxHeight = 40;
        
        // Draw box background
        doc.setFillColor(...this.colors.light);
        doc.rect(boxStartX, this.currentY, boxWidth, boxHeight, 'F');
        
        // Box border
        doc.setDrawColor(...this.colors.secondary);
        doc.rect(boxStartX, this.currentY, boxWidth, boxHeight);
        
        // Summary content in grid
        const contentStartY = this.currentY + 8;
        const leftCol = boxStartX + 10;
        const rightCol = boxStartX + boxWidth / 2 + 10;
        
        doc.setFontSize(10);
        doc.setTextColor(...this.colors.text);
        
        // Left column
        doc.setFont('helvetica', 'bold');
        doc.text('Total Cost:', leftCol, contentStartY);
        doc.setFont('helvetica', 'normal');
        doc.text(this.formatCurrency(totals.totalCost), leftCol + 30, contentStartY);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Total Advance:', leftCol, contentStartY + 8);
        doc.setFont('helvetica', 'normal');
        doc.text(this.formatCurrency(totals.totalAdvance), leftCol + 30, contentStartY + 8);
        
        // Right column
        doc.setFont('helvetica', 'bold');
        doc.text('Cost Per Person:', rightCol, contentStartY);
        doc.setFont('helvetica', 'normal');
        doc.text(this.formatCurrency(totals.costPerPerson), rightCol + 35, contentStartY);
        
        doc.setFont('helvetica', 'bold');
        doc.text('Remaining Balance:', rightCol, contentStartY + 8);
        doc.setFont('helvetica', 'normal');
        const balanceColor = totals.remainingBalance >= 0 ? this.colors.success : this.colors.error;
        doc.setTextColor(...balanceColor);
        doc.text(this.formatCurrency(totals.remainingBalance), rightCol + 35, contentStartY + 8);
        
        this.currentY += boxHeight + 15;
        
        // Individual member calculations
        if (calculations.memberCalculations && calculations.memberCalculations.length > 0) {
            doc.setTextColor(...this.colors.text);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Individual Calculations', this.margin, this.currentY);
            
            this.currentY += 10;
            
            // Table
            const tableStartX = this.margin;
            const colWidths = [40, 30, 30, 30, 30];
            const headers = ['Member', 'Should Pay', 'Advance', 'Final Amount', 'Status'];
            
            this.addTableHeader(doc, tableStartX, colWidths, headers);
            this.currentY += 8;
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            
            calculations.memberCalculations.forEach(member => {
                this.checkPageBreak(doc, 8);
                
                const statusColor = this.getStatusColor(member.status);
                const statusText = this.getStatusText(member.status);
                
                const rowData = [
                    member.name || '',
                    this.formatCurrency(member.amountPerPerson || 0),
                    this.formatCurrency(member.advance || 0),
                    this.formatCurrency(member.finalAmount || 0),
                    statusText
                ];
                
                // Special coloring for the last column (status)
                this.addTableRowWithColors(doc, tableStartX, colWidths, rowData, [
                    this.colors.text,
                    this.colors.text,
                    this.colors.text,
                    this.colors.text,
                    statusColor
                ]);
                
                this.currentY += 6;
            });
            
            this.currentY += 10;
        }
    }
    
    addPaymentSuggestions(doc, calculations) {
        const suggestions = window.calculationEngine?.generatePaymentSuggestions(calculations) || [];
        
        if (suggestions.length === 0) return;
        
        this.checkPageBreak(doc, 40);
        
        doc.setTextColor(...this.colors.text);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Payment Suggestions', this.margin, this.currentY);
        
        this.currentY += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('To settle all balances efficiently:', this.margin, this.currentY);
        
        this.currentY += 8;
        
        suggestions.forEach((suggestion, index) => {
            this.checkPageBreak(doc, 8);
            
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...this.colors.text);
            
            const text = `${index + 1}. ${suggestion.from} pays ${suggestion.to}: ${suggestion.formattedAmount}`;
            doc.text(text, this.margin + 5, this.currentY);
            
            this.currentY += 6;
        });
        
        this.currentY += 10;
    }
    
    addFooter(doc) {
        const footerY = this.pageHeight - 20;
        
        // Horizontal line
        doc.setDrawColor(...this.colors.secondary);
        doc.line(this.margin, footerY - 5, this.pageWidth - this.margin, footerY - 5);
        
        // Footer text
        doc.setTextColor(...this.colors.secondary);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        
        // Left: Generated date
        const generatedText = `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
        doc.text(generatedText, this.margin, footerY);
        
        // Right: App branding
        const brandingText = 'Chia Tiền Nhậu';
        const brandingWidth = doc.getTextWidth(brandingText);
        doc.text(brandingText, this.pageWidth - this.margin - brandingWidth, footerY);
    }
    
    // Utility methods
    addHorizontalLine(doc) {
        doc.setDrawColor(...this.colors.secondary);
        doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
        this.currentY += 5;
    }
    
    addTableHeader(doc, startX, colWidths, headers) {
        doc.setFillColor(...this.colors.light);
        doc.setDrawColor(...this.colors.secondary);
        
        const headerHeight = 8;
        let currentX = startX;
        
        // Draw header background
        const totalWidth = colWidths.reduce((sum, width) => sum + width, 0);
        doc.rect(startX, this.currentY - 2, totalWidth, headerHeight, 'FD');
        
        // Header text
        doc.setTextColor(...this.colors.text);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        
        headers.forEach((header, i) => {
            doc.text(header, currentX + 2, this.currentY + 3);
            currentX += colWidths[i];
        });
    }
    
    addTableRow(doc, startX, colWidths, rowData) {
        doc.setTextColor(...this.colors.text);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        let currentX = startX;
        rowData.forEach((data, i) => {
            doc.text(String(data), currentX + 2, this.currentY);
            currentX += colWidths[i];
        });
    }
    
    addTableRowWithColors(doc, startX, colWidths, rowData, colors) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        let currentX = startX;
        rowData.forEach((data, i) => {
            doc.setTextColor(...colors[i]);
            doc.text(String(data), currentX + 2, this.currentY);
            currentX += colWidths[i];
        });
    }
    
    checkPageBreak(doc, requiredSpace) {
        if (this.currentY + requiredSpace > this.pageHeight - 30) {
            doc.addPage();
            this.currentY = this.margin;
        }
    }
    
    formatCurrency(amount) {
        if (window.calculationEngine) {
            return window.calculationEngine.formatCurrency(amount);
        }
        return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
    }
    
    formatDateRange(dateRange) {
        if (!dateRange || !dateRange.startDate) return 'No date specified';
        
        const startDate = new Date(dateRange.startDate).toLocaleDateString();
        const endDate = new Date(dateRange.endDate).toLocaleDateString();
        
        if (dateRange.startDate === dateRange.endDate) {
            return startDate;
        }
        
        return `${startDate} - ${endDate}`;
    }
    
    getStatusColor(status) {
        switch (status) {
            case 'needs_to_pay':
                return this.colors.error;
            case 'gets_refund':
                return this.colors.success;
            case 'even':
                return this.colors.secondary;
            default:
                return this.colors.text;
        }
    }
    
    getStatusText(status) {
        switch (status) {
            case 'needs_to_pay':
                return 'Needs to Pay';
            case 'gets_refund':
                return 'Gets Refund';
            case 'even':
                return 'Even';
            default:
                return 'Unknown';
        }
    }
    
    generateFilename(session) {
        const date = new Date().toISOString().split('T')[0];
        const location = (session.location || 'Unknown-Location')
            .replace(/[^a-zA-Z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        
        return `ChiaTienNhau_${date}_${location}.pdf`;
    }
}

// Create global PDF exporter instance
window.pdfExporter = new PDFExporter();
