import React, { useState } from 'react';
import { useTranslation } from '../../utils/translations';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { analyticsService, ReportData } from '../../services/analytics';

interface ReportGeneratorProps {
  className?: string;
}

type ReportFormat = 'csv' | 'json' | 'pdf';
type ReportPeriod = '7d' | '30d' | '90d' | 'custom';

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ className = '' }) => {
  const { t } = useTranslation('common');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('30d');
  const [reportFormat, setReportFormat] = useState<ReportFormat>('csv');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [lastReport, setLastReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getDateRange = (): { start: Date; end: Date } => {
    const end = new Date();
    let start: Date;

    switch (reportPeriod) {
      case '7d':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        start = customStartDate ? new Date(customStartDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (customEndDate) {
          end.setTime(new Date(customEndDate).getTime());
        }
        break;
      default:
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  };

  const generateReport = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const { start, end } = getDateRange();
      const reportData = await analyticsService.generateReport(start, end);
      setLastReport(reportData);

      // Generate and download the report file
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (reportFormat) {
        case 'csv':
          content = analyticsService.exportReportAsCSV(reportData);
          filename = `citycircuit-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;
        case 'json':
          content = analyticsService.exportReportAsJSON(reportData);
          filename = `citycircuit-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;
        case 'pdf':
          // For PDF, we would need a PDF generation library
          // For now, we'll export as JSON and show a message
          content = analyticsService.exportReportAsJSON(reportData);
          filename = `citycircuit-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          setError('PDF export is not yet implemented. Exported as JSON instead.');
          break;
        default:
          throw new Error('Unsupported report format');
      }

      // Create and download the file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Failed to generate report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">
          {t('admin.reportGenerator') || 'Report Generator'}
        </h2>
        <p className="text-neutral-600">
          {t('admin.reportGeneratorDesc') || 'Generate comprehensive analytics reports for system usage and performance'}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Report Configuration */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          {t('admin.reportConfiguration') || 'Report Configuration'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Time Period */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              {t('admin.timePeriod') || 'Time Period'}
            </label>
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value as ReportPeriod)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="7d">{t('admin.last7Days') || 'Last 7 Days'}</option>
              <option value="30d">{t('admin.last30Days') || 'Last 30 Days'}</option>
              <option value="90d">{t('admin.last90Days') || 'Last 90 Days'}</option>
              <option value="custom">{t('admin.customRange') || 'Custom Range'}</option>
            </select>
          </div>

          {/* Report Format */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              {t('admin.reportFormat') || 'Report Format'}
            </label>
            <select
              value={reportFormat}
              onChange={(e) => setReportFormat(e.target.value as ReportFormat)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="csv">{t('admin.csvFormat') || 'CSV (Excel Compatible)'}</option>
              <option value="json">{t('admin.jsonFormat') || 'JSON (Raw Data)'}</option>
              <option value="pdf">{t('admin.pdfFormat') || 'PDF (Coming Soon)'}</option>
            </select>
          </div>

          {/* Custom Date Range */}
          {reportPeriod === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('admin.startDate') || 'Start Date'}
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  {t('admin.endDate') || 'End Date'}
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-6">
          <Button
            onClick={generateReport}
            disabled={isGenerating}
            className="bg-primary-600 hover:bg-primary-700"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner size="sm" color="white" className="mr-2" />
                {t('admin.generatingReport') || 'Generating Report...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('admin.generateReport') || 'Generate & Download Report'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Last Report Preview */}
      {lastReport && (
        <div className="bg-white border border-neutral-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">
            {t('admin.lastReportPreview') || 'Last Report Preview'}
          </h3>
          
          <div className="text-sm text-neutral-600 mb-4">
            {t('admin.reportPeriod') || 'Report Period'}: {lastReport.period.start.toLocaleDateString()} - {lastReport.period.end.toLocaleDateString()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-neutral-900">
                {formatNumber(lastReport.usageMetrics.totalUsers)}
              </div>
              <div className="text-sm text-neutral-600">
                {t('admin.totalUsers') || 'Total Users'}
              </div>
            </div>

            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600">
                {formatNumber(lastReport.usageMetrics.activeUsers)}
              </div>
              <div className="text-sm text-neutral-600">
                {t('admin.activeUsers') || 'Active Users'}
              </div>
            </div>

            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600">
                {formatNumber(lastReport.optimizationMetrics.totalOptimizations)}
              </div>
              <div className="text-sm text-neutral-600">
                {t('admin.totalOptimizations') || 'Total Optimizations'}
              </div>
            </div>

            <div className="bg-neutral-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(lastReport.optimizationMetrics.costSavings)}
              </div>
              <div className="text-sm text-neutral-600">
                {t('admin.costSavings') || 'Cost Savings'}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-md font-semibold text-neutral-900 mb-3">
              {t('admin.topRoutes') || 'Top Performing Routes'}
            </h4>
            <div className="space-y-2">
              {lastReport.routeAnalytics.slice(0, 3).map((route, index) => (
                <div key={route.routeId} className="flex items-center justify-between py-2 px-3 bg-neutral-50 rounded">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-medium text-xs">#{index + 1}</span>
                    </div>
                    <span className="font-medium text-neutral-900">{route.routeName}</span>
                  </div>
                  <div className="text-sm text-neutral-600">
                    {formatNumber(route.searchCount)} searches
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report Templates */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-neutral-900 mb-4">
          {t('admin.reportTemplates') || 'Report Templates'}
        </h3>
        <p className="text-neutral-600 mb-4">
          {t('admin.reportTemplatesDesc') || 'Quick access to commonly requested reports'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-neutral-200 rounded-lg p-4">
            <h4 className="font-semibold text-neutral-900 mb-2">
              {t('admin.weeklyReport') || 'Weekly Summary'}
            </h4>
            <p className="text-sm text-neutral-600 mb-3">
              {t('admin.weeklyReportDesc') || 'Key metrics and performance indicators for the past week'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReportPeriod('7d');
                setReportFormat('csv');
                generateReport();
              }}
              disabled={isGenerating}
            >
              {t('admin.generateWeekly') || 'Generate Weekly'}
            </Button>
          </div>

          <div className="border border-neutral-200 rounded-lg p-4">
            <h4 className="font-semibold text-neutral-900 mb-2">
              {t('admin.monthlyReport') || 'Monthly Report'}
            </h4>
            <p className="text-sm text-neutral-600 mb-3">
              {t('admin.monthlyReportDesc') || 'Comprehensive monthly analytics and trends'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReportPeriod('30d');
                setReportFormat('csv');
                generateReport();
              }}
              disabled={isGenerating}
            >
              {t('admin.generateMonthly') || 'Generate Monthly'}
            </Button>
          </div>

          <div className="border border-neutral-200 rounded-lg p-4">
            <h4 className="font-semibold text-neutral-900 mb-2">
              {t('admin.quarterlyReport') || 'Quarterly Report'}
            </h4>
            <p className="text-sm text-neutral-600 mb-3">
              {t('admin.quarterlyReportDesc') || 'Detailed quarterly performance and optimization results'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReportPeriod('90d');
                setReportFormat('csv');
                generateReport();
              }}
              disabled={isGenerating}
            >
              {t('admin.generateQuarterly') || 'Generate Quarterly'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ReportGenerator };