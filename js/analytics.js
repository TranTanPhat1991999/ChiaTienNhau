// ChiaCheck - Analytics System

class AnalyticsManager {
    constructor() {
        this.charts = new Map();
        this.isChartJSLoaded = false;
        this.defaultColors = [
            '#2563eb', '#dc2626', '#16a34a', '#f59e0b',
            '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'
        ];
    }
    
    async initialize() {
        if (this.isChartJSLoaded) return;
        
        try {
            // Wait for Chart.js to be available
            if (typeof Chart === 'undefined') {
                throw new Error('Chart.js library not loaded');
            }
            
            this.isChartJSLoaded = true;
            console.log('Analytics Manager initialized');
        } catch (error) {
            console.error('Failed to initialize Analytics Manager:', error);
            throw new Error('Analytics not available');
        }
    }
    
    async generateSessionAnalytics(sessions) {
        try {
            await this.initialize();
            
            const analytics = {
                overview: this.generateOverview(sessions),
                trends: this.generateTrends(sessions),
                members: this.generateMemberAnalytics(sessions),
                locations: this.generateLocationAnalytics(sessions),
                items: this.generateItemAnalytics(sessions),
                costs: this.generateCostAnalytics(sessions)
            };
            
            return analytics;
        } catch (error) {
            console.error('Failed to generate analytics:', error);
            throw error;
        }
    }
    
    generateOverview(sessions) {
        const overview = {
            totalSessions: sessions.length,
            totalSpent: 0,
            averagePerSession: 0,
            totalMembers: new Set(),
            popularLocations: new Map(),
            timeRange: { start: null, end: null }
        };
        
        sessions.forEach(session => {
            // Total spent
            if (session.totals && session.totals.totalCost) {
                overview.totalSpent += session.totals.totalCost;
            }
            
            // Unique members
            if (session.members) {
                session.members.forEach(member => {
                    overview.totalMembers.add(member.name.toLowerCase());
                });
            }
            
            // Popular locations
            if (session.location) {
                const count = overview.popularLocations.get(session.location) || 0;
                overview.popularLocations.set(session.location, count + 1);
            }
            
            // Time range
            const sessionDate = new Date(session.createdAt || session.updatedAt);
            if (!overview.timeRange.start || sessionDate < overview.timeRange.start) {
                overview.timeRange.start = sessionDate;
            }
            if (!overview.timeRange.end || sessionDate > overview.timeRange.end) {
                overview.timeRange.end = sessionDate;
            }
        });
        
        overview.averagePerSession = sessions.length > 0 ? overview.totalSpent / sessions.length : 0;
        overview.uniqueMembers = overview.totalMembers.size;
        
        return overview;
    }
    
    generateTrends(sessions) {
        const trends = {
            monthly: new Map(),
            weekly: new Map(),
            daily: new Map()
        };
        
        sessions.forEach(session => {
            const date = new Date(session.createdAt || session.updatedAt);
            const cost = session.totals?.totalCost || 0;
            
            // Monthly trends
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthData = trends.monthly.get(monthKey) || { sessions: 0, cost: 0 };
            monthData.sessions += 1;
            monthData.cost += cost;
            trends.monthly.set(monthKey, monthData);
            
            // Weekly trends
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            const weekData = trends.weekly.get(weekKey) || { sessions: 0, cost: 0 };
            weekData.sessions += 1;
            weekData.cost += cost;
            trends.weekly.set(weekKey, weekData);
            
            // Daily trends
            const dayKey = date.toISOString().split('T')[0];
            const dayData = trends.daily.get(dayKey) || { sessions: 0, cost: 0 };
            dayData.sessions += 1;
            dayData.cost += cost;
            trends.daily.set(dayKey, dayData);
        });
        
        return trends;
    }
    
    generateMemberAnalytics(sessions) {
        const memberStats = new Map();
        
        sessions.forEach(session => {
            if (!session.members) return;
            
            session.members.forEach(member => {
                const name = member.name;
                const stats = memberStats.get(name) || {
                    sessions: 0,
                    totalSpent: 0,
                    totalAdvance: 0,
                    items: 0,
                    averagePerSession: 0
                };
                
                stats.sessions += 1;
                
                if (member.items) {
                    member.items.forEach(item => {
                        const price = window.calculationEngine?.parseExpression(item.price) || 0;
                        stats.totalSpent += price;
                        stats.items += 1;
                    });
                }
                
                const advance = window.calculationEngine?.parseExpression(member.advance) || 0;
                stats.totalAdvance += advance;
                
                stats.averagePerSession = stats.totalSpent / stats.sessions;
                
                memberStats.set(name, stats);
            });
        });
        
        return memberStats;
    }
    
    generateLocationAnalytics(sessions) {
        const locationStats = new Map();
        
        sessions.forEach(session => {
            if (!session.location) return;
            
            const location = session.location;
            const stats = locationStats.get(location) || {
                visits: 0,
                totalSpent: 0,
                averagePerVisit: 0,
                memberCount: 0,
                lastVisit: null
            };
            
            stats.visits += 1;
            stats.totalSpent += session.totals?.totalCost || 0;
            stats.memberCount += session.members?.length || 0;
            
            const visitDate = new Date(session.createdAt || session.updatedAt);
            if (!stats.lastVisit || visitDate > stats.lastVisit) {
                stats.lastVisit = visitDate;
            }
            
            stats.averagePerVisit = stats.totalSpent / stats.visits;
            stats.averageMembersPerVisit = stats.memberCount / stats.visits;
            
            locationStats.set(location, stats);
        });
        
        return locationStats;
    }
    
    generateItemAnalytics(sessions) {
        const itemStats = new Map();
        
        sessions.forEach(session => {
            if (!session.members) return;
            
            session.members.forEach(member => {
                if (!member.items) return;
                
                member.items.forEach(item => {
                    const name = item.name;
                    const price = window.calculationEngine?.parseExpression(item.price) || 0;
                    
                    const stats = itemStats.get(name) || {
                        count: 0,
                        totalCost: 0,
                        averageCost: 0,
                        minCost: Infinity,
                        maxCost: 0,
                        sessions: new Set()
                    };
                    
                    stats.count += 1;
                    stats.totalCost += price;
                    stats.minCost = Math.min(stats.minCost, price);
                    stats.maxCost = Math.max(stats.maxCost, price);
                    stats.sessions.add(session.id);
                    stats.averageCost = stats.totalCost / stats.count;
                    
                    itemStats.set(name, stats);
                });
            });
        });
        
        // Convert sessions Set to count
        itemStats.forEach(stats => {
            stats.sessionCount = stats.sessions.size;
            delete stats.sessions;
        });
        
        return itemStats;
    }
    
    generateCostAnalytics(sessions) {
        const costs = sessions.map(s => s.totals?.totalCost || 0).filter(c => c > 0);
        
        if (costs.length === 0) {
            return {
                total: 0,
                average: 0,
                median: 0,
                min: 0,
                max: 0,
                distribution: []
            };
        }
        
        costs.sort((a, b) => a - b);
        
        const analytics = {
            total: costs.reduce((sum, cost) => sum + cost, 0),
            average: costs.reduce((sum, cost) => sum + cost, 0) / costs.length,
            median: costs[Math.floor(costs.length / 2)],
            min: costs[0],
            max: costs[costs.length - 1],
            distribution: this.generateCostDistribution(costs)
        };
        
        return analytics;
    }
    
    generateCostDistribution(costs) {
        if (costs.length === 0) return [];
        
        const min = Math.min(...costs);
        const max = Math.max(...costs);
        const range = max - min;
        const buckets = Math.min(10, costs.length); // Max 10 buckets
        const bucketSize = range / buckets;
        
        const distribution = [];
        
        for (let i = 0; i < buckets; i++) {
            const bucketMin = min + (i * bucketSize);
            const bucketMax = min + ((i + 1) * bucketSize);
            const count = costs.filter(cost => cost >= bucketMin && cost < bucketMax).length;
            
            distribution.push({
                range: `${this.formatCurrency(bucketMin)} - ${this.formatCurrency(bucketMax)}`,
                count: count,
                percentage: (count / costs.length) * 100
            });
        }
        
        return distribution;
    }
    
    async createExpenseChart(canvasId, analytics) {
        try {
            await this.initialize();
            
            const canvas = document.getElementById(canvasId);
            if (!canvas) throw new Error(`Canvas ${canvasId} not found`);
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (this.charts.has(canvasId)) {
                this.charts.get(canvasId).destroy();
            }
            
            const monthlyData = Array.from(analytics.trends.monthly.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(-12); // Last 12 months
            
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: monthlyData.map(([month]) => {
                        const [year, monthNum] = month.split('-');
                        return new Date(year, monthNum - 1).toLocaleDateString('en-US', { 
                            month: 'short', 
                            year: '2-digit' 
                        });
                    }),
                    datasets: [{
                        label: 'Total Spending',
                        data: monthlyData.map(([, data]) => data.cost),
                        borderColor: this.defaultColors[0],
                        backgroundColor: this.defaultColors[0] + '20',
                        tension: 0.4,
                        fill: true
                    }, {
                        label: 'Sessions',
                        data: monthlyData.map(([, data]) => data.sessions),
                        borderColor: this.defaultColors[1],
                        backgroundColor: this.defaultColors[1] + '20',
                        tension: 0.4,
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Spending Trends'
                        },
                        legend: {
                            display: true
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            title: {
                                display: true,
                                text: 'Amount'
                            },
                            ticks: {
                                callback: (value) => this.formatCurrency(value)
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Sessions'
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                        }
                    }
                }
            });
            
            this.charts.set(canvasId, chart);
            return chart;
            
        } catch (error) {
            console.error('Failed to create expense chart:', error);
            throw error;
        }
    }
    
    async createMemberChart(canvasId, analytics) {
        try {
            await this.initialize();
            
            const canvas = document.getElementById(canvasId);
            if (!canvas) throw new Error(`Canvas ${canvasId} not found`);
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (this.charts.has(canvasId)) {
                this.charts.get(canvasId).destroy();
            }
            
            const memberData = Array.from(analytics.members.entries())
                .sort(([, a], [, b]) => b.totalSpent - a.totalSpent)
                .slice(0, 10); // Top 10 members
            
            const chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: memberData.map(([name]) => name),
                    datasets: [{
                        label: 'Total Spending',
                        data: memberData.map(([, data]) => data.totalSpent),
                        backgroundColor: this.defaultColors.slice(0, memberData.length),
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Top Spenders'
                        },
                        legend: {
                            position: 'right'
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => {
                                    const label = context.label || '';
                                    const value = this.formatCurrency(context.raw);
                                    const percentage = ((context.raw / context.dataset.data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                                    return `${label}: ${value} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
            
            this.charts.set(canvasId, chart);
            return chart;
            
        } catch (error) {
            console.error('Failed to create member chart:', error);
            throw error;
        }
    }
    
    async createLocationChart(canvasId, analytics) {
        try {
            await this.initialize();
            
            const canvas = document.getElementById(canvasId);
            if (!canvas) throw new Error(`Canvas ${canvasId} not found`);
            
            const ctx = canvas.getContext('2d');
            
            // Destroy existing chart if it exists
            if (this.charts.has(canvasId)) {
                this.charts.get(canvasId).destroy();
            }
            
            const locationData = Array.from(analytics.locations.entries())
                .sort(([, a], [, b]) => b.visits - a.visits)
                .slice(0, 8); // Top 8 locations
            
            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: locationData.map(([name]) => name.length > 20 ? name.substring(0, 17) + '...' : name),
                    datasets: [{
                        label: 'Visits',
                        data: locationData.map(([, data]) => data.visits),
                        backgroundColor: this.defaultColors[0],
                        borderColor: this.defaultColors[0],
                        borderWidth: 1
                    }, {
                        label: 'Total Spent',
                        data: locationData.map(([, data]) => data.totalSpent / 1000), // Scale down for visibility
                        backgroundColor: this.defaultColors[1],
                        borderColor: this.defaultColors[1],
                        borderWidth: 1,
                        yAxisID: 'y1'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Popular Locations'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Visits'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            title: {
                                display: true,
                                text: 'Spending (k)'
                            },
                            grid: {
                                drawOnChartArea: false,
                            },
                        }
                    }
                }
            });
            
            this.charts.set(canvasId, chart);
            return chart;
            
        } catch (error) {
            console.error('Failed to create location chart:', error);
            throw error;
        }
    }
    
    generateInsights(analytics) {
        const insights = [];
        
        // Spending insights
        if (analytics.overview.totalSessions > 0) {
            const avgPerSession = analytics.overview.averagePerSession;
            insights.push({
                type: 'spending',
                title: 'Average Session Cost',
                value: this.formatCurrency(avgPerSession),
                description: `You spend an average of ${this.formatCurrency(avgPerSession)} per session`
            });
        }
        
        // Member insights
        if (analytics.members.size > 0) {
            const topSpender = Array.from(analytics.members.entries())
                .sort(([, a], [, b]) => b.totalSpent - a.totalSpent)[0];
            
            insights.push({
                type: 'member',
                title: 'Top Spender',
                value: topSpender[0],
                description: `${topSpender[0]} has spent ${this.formatCurrency(topSpender[1].totalSpent)} across ${topSpender[1].sessions} sessions`
            });
        }
        
        // Location insights
        if (analytics.locations.size > 0) {
            const favoriteLocation = Array.from(analytics.locations.entries())
                .sort(([, a], [, b]) => b.visits - a.visits)[0];
            
            insights.push({
                type: 'location',
                title: 'Favorite Location',
                value: favoriteLocation[0],
                description: `You've visited ${favoriteLocation[0]} ${favoriteLocation[1].visits} times`
            });
        }
        
        // Time-based insights
        if (analytics.trends.monthly.size > 1) {
            const monthlyData = Array.from(analytics.trends.monthly.values());
            const recentMonths = monthlyData.slice(-3);
            const avgRecent = recentMonths.reduce((sum, data) => sum + data.cost, 0) / recentMonths.length;
            const prevMonths = monthlyData.slice(-6, -3);
            const avgPrevious = prevMonths.length > 0 ? prevMonths.reduce((sum, data) => sum + data.cost, 0) / prevMonths.length : 0;
            
            if (avgPrevious > 0) {
                const change = ((avgRecent - avgPrevious) / avgPrevious) * 100;
                const trend = change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable';
                
                insights.push({
                    type: 'trend',
                    title: 'Spending Trend',
                    value: `${Math.abs(change).toFixed(1)}% ${change > 0 ? 'increase' : 'decrease'}`,
                    description: `Your spending is ${trend} compared to previous months`
                });
            }
        }
        
        return insights;
    }
    
    exportAnalytics(analytics, format = 'json') {
        try {
            const exportData = {
                generatedAt: new Date().toISOString(),
                overview: analytics.overview,
                insights: this.generateInsights(analytics),
                summary: {
                    totalSessions: analytics.overview.totalSessions,
                    totalSpent: analytics.overview.totalSpent,
                    uniqueMembers: analytics.overview.uniqueMembers,
                    uniqueLocations: analytics.locations.size,
                    averagePerSession: analytics.overview.averagePerSession
                }
            };
            
            switch (format) {
                case 'json':
                    return JSON.stringify(exportData, null, 2);
                case 'csv':
                    return this.convertToCSV(exportData);
                default:
                    return JSON.stringify(exportData);
            }
        } catch (error) {
            console.error('Failed to export analytics:', error);
            throw error;
        }
    }
    
    convertToCSV(data) {
        // Simple CSV export of key metrics
        let csv = 'Metric,Value\n';
        csv += `Total Sessions,${data.summary.totalSessions}\n`;
        csv += `Total Spent,${data.summary.totalSpent}\n`;
        csv += `Unique Members,${data.summary.uniqueMembers}\n`;
        csv += `Unique Locations,${data.summary.uniqueLocations}\n`;
        csv += `Average Per Session,${data.summary.averagePerSession}\n`;
        
        return csv;
    }
    
    formatCurrency(amount) {
        if (window.calculationEngine) {
            return window.calculationEngine.formatCurrency(amount);
        }
        return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
    }
    
    destroyChart(canvasId) {
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
            this.charts.delete(canvasId);
        }
    }
    
    destroyAllCharts() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }
}

// Create global analytics manager
window.analyticsManager = new AnalyticsManager();
