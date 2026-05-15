import { Popover, Button } from 'antd';
import { UserOutlined, CalendarOutlined, InfoCircleOutlined } from '@ant-design/icons';

export default function StatusWithDetails({ status, reason, actionBy, actionDate }) {
  // Define mapping for styles based on status
  const getBadgeStyle = (currentStatus) => {
    switch (currentStatus?.toUpperCase()) {
      case 'DECLINED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'APPROVED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ON_HOLD':
      case 'ON-HOLD':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PENDING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getStatusIcon = (currentStatus) => {
    switch (currentStatus?.toUpperCase()) {
      case 'DECLINED':
        return '🔴';
      case 'APPROVED':
        return '🟢';
      case 'ON_HOLD':
      case 'ON-HOLD':
        return '🟡';
      case 'PENDING':
        return '🔵';
      case 'DRAFT':
        return '⚪';
      default:
        return '📍';
    }
  };

  const hasDetails = reason || actionBy || actionDate;

  const content = (
    <div className="w-64 p-2">
      <div className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-2 border-b pb-1">
        Decision Details
      </div>
      
      {reason && (
        <div className="mb-3">
          <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap">{reason}</p>
        </div>
      )}
      
      <div className="flex flex-col gap-1.5 text-xs text-slate-500 mt-2">
        {actionBy && (
          <div className="flex items-center gap-2">
            <UserOutlined className="text-slate-400" />
            <span className="font-semibold">{actionBy}</span>
          </div>
        )}
        {actionDate && (
          <div className="flex items-center gap-2">
            <CalendarOutlined className="text-slate-400" />
            <span>{actionDate}</span>
          </div>
        )}
      </div>
      
      {!hasDetails && (
        <p className="text-sm italic text-slate-500">No additional details provided.</p>
      )}
    </div>
  );

  // Only show reason popover for specific statuses (Declined/On Hold)
  const showPopover = hasDetails && (
    status?.toUpperCase() === 'DECLINED' || 
    status?.toUpperCase() === 'REJECTED' || 
    status?.toUpperCase() === 'ON HOLD' || 
    status?.toUpperCase() === 'ON_HOLD' ||
    status?.toUpperCase() === 'ON-HOLD'
  );

  return (
    <div className="flex items-center gap-3">
      {/* Badge */}
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${getBadgeStyle(status)}`}>
        {getStatusIcon(status)}
        <span className="tracking-wide uppercase">{status}</span>
      </span>

      {/* Popover */}
      {showPopover && (
        <Popover content={content} trigger="click" placement="bottomLeft">
          <button className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
            <InfoCircleOutlined />
            View Reason
          </button>
        </Popover>
      )}
    </div>
  );
}
