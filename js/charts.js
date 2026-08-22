/**
 * Cassa Comune Charts Handler
 */

let categoryChartInstance = null;

/**
 * Renders or updates the category doughnut chart.
 * @param {string} canvasId - DOM element ID of the canvas
 * @param {Object} categoryData - Object containing { category: totalAmount }
 */
export function renderCategoryChart(canvasId, categoryData) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Check if there's any spending
    const categories = Object.keys(categoryData);
    const amounts = Object.values(categoryData);
    const total = amounts.reduce((a, b) => a + b, 0);

    // Destroy existing instance to prevent hover bugs
    if (categoryChartInstance) {
        categoryChartInstance.destroy();
        categoryChartInstance = null;
    }

    if (total === 0) {
        // Draw "No data" state inside the canvas context
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px Outfit';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Nessuna spesa registrata per visualizzare il grafico.', canvas.width / 2, canvas.height / 2);
        return;
    }

    // Config options
    const chartConfig = {
        type: 'doughnut',
        data: {
            labels: categories,
            datasets: [{
                data: amounts,
                backgroundColor: [
                    '#f59e0b', // Food (🍔)
                    '#3b82f6', // Housing (🏨)
                    '#10b981', // Transport (🚗)
                    '#ec4899', // Leisure (🎭)
                    '#8b5cf6'  // Other (📦)
                ],
                borderWidth: 2,
                borderColor: '#1e2230',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#f3f4f6',
                        font: {
                            family: 'Outfit',
                            size: 12
                        },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 18, 28, 0.95)',
                    titleColor: '#fff',
                    titleFont: {
                        family: 'Outfit',
                        weight: 'bold'
                    },
                    bodyColor: '#f3f4f6',
                    bodyFont: {
                        family: 'Outfit'
                    },
                    borderColor: 'rgba(255, 255, 255, 0.08)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: function(context) {
                            const val = context.raw || 0;
                            const percentage = ((val / total) * 100).toFixed(1);
                            return ` ${context.label}: ${val.toFixed(2)} € (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '65%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    };

    categoryChartInstance = new Chart(ctx, chartConfig);
}
