import { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { IconCircleX } from '@tabler/icons-react';

interface Props {
  onCloseSystemSetting: () => void;
  onChangeLanguage: (value: string) => void;
  language: string | null;
}


const localOptions = [
  { key: 'zh', text: "Chinese"},
  { key: 'en', text: "English"},
  { key: 'bn', text: "Bengali"},
  { key: 'de', text: "German"},
  { key: 'es', text: "Spanish"},
  { key: 'fr', text: "French"},
  { key: 'he', text: "Hebrew"},
  { key: 'id', text: "Indonesian"},
  { key: 'ja', text: "Japanese"},
  { key: 'ko', text: "Korean"},
  { key: 'pt', text: "Portuguese"},
  { key: 'ru', text: "Russian"},
  { key: 'sv', text: "Swedish"},
  { key: 'te', text: "Telugu"},
  { key: 'vi', text: "Vietnamese"},
]


export const Settings: FC<Props> = ({onCloseSystemSetting, onChangeLanguage, language}) => {
  const { t } = useTranslation('settings');
  return (
  <div className="overflow-none relative p-10 flex-1 bg-white dark:bg-[#343541]">
    <div className="mx-auto flex h-full pt-10 flex-col space-y-6">
      <IconCircleX className="absolute top-10 right-10 z-50 h-7 w-7 cursor-pointer text-white hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:h-8 sm:w-8 sm:text-neutral-700" onClick={ () => onCloseSystemSetting() } />
      <h2 className="text-base font-semibold leading-7 text-gray-800 dark:text-gray-100">{ t('System Settings') }</h2>
      <div>
        <label htmlFor="first-name" className="block text-sm font-medium leading-6 text-gray-800  dark:text-gray-100">Api Key</label>
        <div className="mt-2">
          <input type="text" name="first-name" id="first-name" autoComplete="given-name" className="block w-full rounded-md border-0 py-1.5 border border-neutral-600 bg-[#202123] px-4 py-3 pr-10 text-[12px] leading-3 text-white" />
        </div>
      </div>
      <div>
        <label htmlFor="first-name" className="block text-sm font-medium leading-6 text-gray-800  dark:text-gray-100">Use Bridge</label>
        <div className="mt-2">
          <select id="proxy" name="proxy" autoComplete="proxy-name" className="block w-full rounded-md border-0 py-1.5 border border-neutral-600 bg-[#202123] px-4 py-3 pr-10 text-[12px] leading-3 text-white">
            <option>{ t('Default') }</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="first-name" className="block text-sm font-medium leading-6 text-gray-800  dark:text-gray-100">{ t('Interface Language') }</label>
        <div className="mt-2">
          <select id="country" value={language || ''} onChange={($event) => onChangeLanguage($event.target.value)} name="country" autoComplete="country-name" className="block w-full rounded-md border-0 py-1.5 border border-neutral-600 bg-[#202123] px-4 py-3 pr-10 text-[12px] leading-3 text-white">
            <option value="">{ t('Default') }</option>
            { localOptions.map(({key, text}) => <option key={key} value={key}>{ t(text) }</option>) }
          </select>
        </div>
      </div>
    </div>
  </div>
  );
};
