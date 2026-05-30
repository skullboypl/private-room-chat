import ChatApp from '@/components/ChatApp';
import PwaRegister from '@/components/PwaRegister';
import PwaSafeArea from '@/components/PwaSafeArea';
import { LocaleProvider } from '@/context/LocaleContext';

export default function HomePage() {
  return (
    <LocaleProvider>
      <PwaSafeArea />
      <div className="site-shell site-shell--pwa">
        <ChatApp />
        <PwaRegister />
      </div>
    </LocaleProvider>
  );
}
