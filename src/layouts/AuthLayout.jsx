import { BarChart3, ClipboardCheck, FolderKanban, Trophy } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';

export default function AuthLayout({ children }) {
  const { t } = useLanguage();
  const features = [
    { icon: FolderKanban, label: t('จัดการโครงการ', 'Projects') },
    { icon: ClipboardCheck, label: t('ประเมินผลงาน', 'Evaluation') },
    { icon: BarChart3, label: t('สรุปผลคะแนน', 'Results') },
  ];

  return <div className="flex min-h-dvh flex-col bg-page-background text-slate-900">
    <header className="border-b border-slate-200/80 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xs"><Trophy className="h-5 w-5 text-amber-300" aria-hidden="true" /></span>
          <div className="leading-tight"><span className="block text-lg font-bold tracking-tight">MultiRole</span><span className="block text-[10px] font-medium text-slate-500">Evaluation Platform</span></div>
        </div>
        <LanguageSwitcher />
      </div>
    </header>

    <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
      <section aria-labelledby="login-product-title" className="hidden lg:block">
        <div className="mb-5 flex items-center gap-3 text-xs font-semibold tracking-wide text-blue-700"><span className="h-px w-8 bg-blue-500" aria-hidden="true" />{t('แพลตฟอร์มประเมินการแข่งขัน', 'COMPETITION EVALUATION')}</div>
        <h2 id="login-product-title" className="text-4xl font-bold leading-[1.5] tracking-tight text-slate-900"><span className="block">{t('ระบบบริหารจัดการ', 'Competition management')}</span><span className="block text-blue-700">{t('และประเมินการแข่งขัน', 'and evaluation')}</span></h2>
        <p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">{t('จัดการทีม เกณฑ์ และผลการประเมินในพื้นที่เดียว สำหรับผู้ดูแลโครงการและกรรมการ', 'One workspace for teams, scoring criteria, and results. Built for competition administrators and judges.')}</p>
        <div className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-slate-200 pt-6">
          {features.map(({ icon: Icon, label }) => <div key={label} className="space-y-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-600"><Icon className="h-5 w-5" aria-hidden="true" /></span><p className="text-xs font-semibold text-slate-600">{label}</p></div>)}
        </div>
      </section>

      {children}
    </main>
    <footer className="px-5 py-5 text-center text-xs text-slate-400">© {new Date().getFullYear()} MultiRole Evaluation Platform</footer>
  </div>;
}
