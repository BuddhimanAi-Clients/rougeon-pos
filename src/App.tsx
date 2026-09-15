import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireStaff } from './components/PosLayout'
import { HistoryPage } from './pages/HistoryPage'
import { LoginPage } from './pages/LoginPage'
import { NewSalePage } from './pages/NewSalePage'
import { ReceiptPage } from './pages/ReceiptPage'
import { SaleDetailPage } from './pages/SaleDetailPage'
import { SaleSuccessPage } from './pages/SaleSuccessPage'
import { SyncPage } from './pages/SyncPage'
import { PosDashboardPage } from './pages/PosDashboardPage'
import { PosCustomersPage } from './pages/PosCustomersPage'
import { PosBirthdaysPage } from './pages/PosBirthdaysPage'
import './App.css'
import './pos-updates.css'

export default function App() {
  return <Routes><Route path="/login" element={<LoginPage />} /><Route element={<RequireStaff />}><Route path="/sale" element={<NewSalePage />} /><Route path="/dashboard" element={<PosDashboardPage />} /><Route path="/customers" element={<PosCustomersPage />} /><Route path="/birthdays" element={<PosBirthdaysPage />} /><Route path="/success" element={<SaleSuccessPage />} /><Route path="/history" element={<HistoryPage />} /><Route path="/history/:saleId" element={<SaleDetailPage />} /><Route path="/receipt/:saleId" element={<ReceiptPage />} /><Route path="/sync" element={<SyncPage />} /></Route><Route path="*" element={<Navigate to="/sale" replace />} /></Routes>
}
