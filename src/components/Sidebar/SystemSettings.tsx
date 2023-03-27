import { IconSettings } from '@tabler/icons-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { SidebarButton } from './SidebarButton';
interface Props {
  lightMode?: 'light' | 'dark';
  onSystemSetting: () => void;
}

export const SystemSettings: FC<Props> = ({
  onSystemSetting
}) => {
  const { t } = useTranslation('sidebar');
  return <SidebarButton
    text={t('System Settings')}
    icon={<IconSettings size={18} />}
    onClick={() => onSystemSetting()}
  />;
};
