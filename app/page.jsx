import ChatApp from '@/components/ChatApp';
import PwaRegister from '@/components/PwaRegister';
import { LocaleProvider } from '@/context/LocaleContext';

export default function HomePage() {
  return (
    <LocaleProvider>
      <div className="site-shell">
        <ChatApp />
        <PwaRegister />
      </div>
    </LocaleProvider>
  );
}
