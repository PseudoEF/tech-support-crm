import { createKbArticles } from './kbSeed';
import { DEFAULT_SLA_POLICIES, getSlaPolicy } from './sla';
import type {
  ActivityEvent,
  ActivityType,
  Agent,
  Asset,
  AssetKind,
  AssetStatus,
  Client,
  ClientKind,
  CrmSnapshot,
  KbArticle,
  Message,
  Priority,
  Team,
  Ticket,
  TicketChannel,
  TicketStatus,
} from './types';

const TICKET_COUNT = 120;
const CLIENT_COUNT = 35;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
export const DEMO_SEED = 0x5eed_c0de;

export interface SeedOptions {
  seed?: number;
  now?: Date;
}

interface RandomSource {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  chance(probability: number): boolean;
}

export function createPrng(seed: number): RandomSource {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };

  const int = (min: number, max: number): number => {
    const low = Math.ceil(Math.min(min, max));
    const high = Math.floor(Math.max(min, max));
    return low + Math.floor(next() * (high - low + 1));
  };

  const pick = <T,>(items: readonly T[]): T => {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty collection');
    }
    return items[int(0, items.length - 1)];
  };

  return {
    next,
    int,
    pick,
    chance: (probability) => next() < probability,
  };
}

const TEAMS: Team[] = [
  {
    id: 'team-1',
    name: 'Первая линия',
    description: 'Первичная диагностика, подключение и типовые обращения',
    color: '#2f6fed',
  },
  {
    id: 'team-2',
    name: 'Сеть и оборудование',
    description: 'Аварии, оптика, маршрутизаторы и СКТВ',
    color: '#0f9f8f',
  },
  {
    id: 'team-3',
    name: 'Биллинг',
    description: 'Платежи, тарифы, документы и блокировки',
    color: '#b26a00',
  },
  {
    id: 'team-4',
    name: 'Бизнес-поддержка',
    description: 'B2B-клиенты, статические IP, VPN и SLA-контракты',
    color: '#7c4dd4',
  },
];

const AGENTS: Agent[] = [
  {
    id: 'agent-1',
    name: 'Дмитрий Соколов',
    email: 'd.sokolov@helpdesk.example',
    role: 'Старший специалист',
    teamId: 'team-1',
    online: true,
  },
  {
    id: 'agent-2',
    name: 'Анна Лебедева',
    email: 'a.lebedeva@helpdesk.example',
    role: 'Специалист поддержки',
    teamId: 'team-1',
    online: true,
  },
  {
    id: 'agent-3',
    name: 'Игорь Волков',
    email: 'i.volkov@helpdesk.example',
    role: 'Сетевой инженер',
    teamId: 'team-2',
    online: true,
  },
  {
    id: 'agent-4',
    name: 'Марина Кузнецова',
    email: 'm.kuznetsova@helpdesk.example',
    role: 'Сетевой инженер',
    teamId: 'team-2',
    online: false,
  },
  {
    id: 'agent-5',
    name: 'Сергей Морозов',
    email: 's.morozov@helpdesk.example',
    role: 'Специалист биллинга',
    teamId: 'team-3',
    online: true,
  },
  {
    id: 'agent-6',
    name: 'Елена Павлова',
    email: 'e.pavlova@helpdesk.example',
    role: 'Специалист биллинга',
    teamId: 'team-3',
    online: true,
  },
  {
    id: 'agent-7',
    name: 'Алексей Наумов',
    email: 'a.naumov@helpdesk.example',
    role: 'Инженер B2B',
    teamId: 'team-4',
    online: true,
  },
  {
    id: 'agent-8',
    name: 'Ольга Виноградова',
    email: 'o.vinogradova@helpdesk.example',
    role: 'Аккаунт-менеджер',
    teamId: 'team-4',
    online: false,
  },
];

const MALE_NAMES = [
  'Артём',
  'Максим',
  'Илья',
  'Кирилл',
  'Роман',
  'Никита',
  'Павел',
  'Денис',
  'Владислав',
  'Егор',
  'Тимур',
  'Андрей',
  'Михаил',
  'Степан',
  'Глеб',
  'Иван',
  'Фёдор',
  'Лев',
];

const FEMALE_NAMES = [
  'Мария',
  'Софья',
  'Виктория',
  'Полина',
  'Дарья',
  'Алиса',
  'Ксения',
  'Варвара',
  'Татьяна',
  'Юлия',
  'Наталья',
  'Ирина',
  'Светлана',
  'Вероника',
  'Ева',
  'Ольга',
  'Анастасия',
  'Валерия',
];

const MALE_SURNAMES = [
  'Смирнов',
  'Иванов',
  'Кузнецов',
  'Попов',
  'Лебедев',
  'Козлов',
  'Новиков',
  'Морозов',
  'Петров',
  'Волков',
  'Соловьёв',
  'Васильев',
  'Зайцев',
  'Павлов',
  'Семёнов',
  'Голубев',
  'Богданов',
  'Воробьёв',
  'Фёдоров',
  'Михайлов',
  'Беляев',
  'Тарасов',
  'Белов',
  'Комаров',
  'Орлов',
  'Киселёв',
  'Макаров',
  'Андреев',
  'Ковалёв',
  'Ильин',
  'Гусев',
  'Титов',
  'Кузьмин',
  'Кудрявцев',
  'Баранов',
];

interface BusinessSeed {
  company: string;
  contact: string;
  city: string;
}

const BUSINESS_CLIENTS: BusinessSeed[] = [
  { company: 'ООО «Северный ветер»', contact: 'Марина Ковалёва', city: 'Санкт-Петербург' },
  { company: 'Кофейня «Тёплый угол»', contact: 'Анна Соколова', city: 'Москва' },
  { company: 'ООО «Логистика Плюс»', contact: 'Виктор Орлов', city: 'Екатеринбург' },
  { company: 'Стоматология «Белый кит»', contact: 'Елена Зайцева', city: 'Казань' },
  { company: 'ООО «Кибермаркет»', contact: 'Артём Беляев', city: 'Новосибирск' },
  { company: 'Студия «Тон»', contact: 'Полина Гусева', city: 'Москва' },
  { company: 'ООО «АгроТрейд»', contact: 'Сергей Титов', city: 'Краснодар' },
  { company: 'Барбершоп «Грань»', contact: 'Илья Кузьмин', city: 'Санкт-Петербург' },
  { company: 'ООО «ТехноПарк»', contact: 'Ольга Виноградова', city: 'Нижний Новгород' },
];

const CITIES = [
  'Москва',
  'Санкт-Петербург',
  'Казань',
  'Екатеринбург',
  'Новосибирск',
  'Нижний Новгород',
  'Краснодар',
  'Самара',
];

const STREETS = [
  'Лесная',
  'Северная',
  'Речная',
  'Мира',
  'Солнечная',
  'Парковая',
  'Центральная',
  'Гагарина',
  'Строителей',
  'Луговая',
  'Полевая',
  'Набережная',
];

const HOME_TARIFFS = [
  'Домашний 300',
  'Домашний 500',
  'Гигабит',
  'Старт 100',
  'Комфорт 200',
];

const BUSINESS_TARIFFS = [
  'Бизнес 100',
  'Бизнес 300',
  'Бизнес 500',
  'Офисный гигабит',
  'SLA Стандарт',
];

const CLIENT_NOTES = [
  'Клиент предпочитает звонки после 18:00.',
  'В доме установлен общий коммутатор, требуется согласование доступа.',
  'Ранее была замена ONU по гарантии.',
  'Просил не отправлять SMS, связь только по e-mail.',
  'Приоритетный клиент программы лояльности.',
  '',
  '',
];

const TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

function transliterate(value: string): string {
  return value
    .toLowerCase()
    .split('')
    .map((char) => {
      const mapped = TRANSLIT[char];
      if (mapped !== undefined) return mapped;
      return /[a-z0-9]/.test(char) ? char : '';
    })
    .join('');
}

function femaleSurname(surname: string): string {
  if (surname.endsWith('ий')) return `${surname.slice(0, -2)}ая`;
  if (surname.endsWith('ый')) return `${surname.slice(0, -2)}ая`;
  return `${surname}а`;
}

function pad(value: number, length = 4): string {
  return String(value).padStart(length, '0');
}

function addMinutes(baseMs: number, minutes: number): number {
  return baseMs + Math.round(minutes) * MINUTE_MS;
}

function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

interface Scenario {
  subject: string;
  description: string;
  teamId: string;
  priorities: readonly Priority[];
  tags: readonly string[];
  audience?: ClientKind;
  assetKind?: AssetKind;
}

const SCENARIOS: readonly Scenario[] = [
  {
    subject: 'Нет доступа к интернету',
    description:
      'Здравствуйте! Со вчерашнего вечера не работает интернет: на терминале горит красный индикатор. Перезагрузка не помогла, баланс положительный.',
    teamId: 'team-2',
    priorities: ['high', 'critical', 'normal', 'high'],
    tags: ['нет связи', 'оптика'],
    assetKind: 'ont',
  },
  {
    subject: 'Скорость ниже заявленной по тарифу',
    description:
      'Скорость держится около 20–30 Мбит/с вместо 300 по тарифу. Проверял по кабелю, результат тот же. Мешает удалённой работе.',
    teamId: 'team-1',
    priorities: ['normal', 'normal', 'high'],
    tags: ['скорость', 'диагностика'],
    assetKind: 'router',
  },
  {
    subject: 'Телефон не подключается к домашнему Wi-Fi',
    description:
      'Телефон перестал подключаться к Wi-Fi, пишет «Неверный пароль». Другие устройства в квартире работают нормально.',
    teamId: 'team-1',
    priorities: ['normal', 'low', 'normal'],
    tags: ['Wi-Fi', 'телефон'],
  },
  {
    subject: 'Помогите настроить новый роутер',
    description:
      'Купил новый роутер, не могу настроить подключение. Старое оборудование работало нормально. Нужны параметры для PPPoE.',
    teamId: 'team-1',
    priorities: ['low', 'normal'],
    tags: ['роутер', 'настройка'],
    assetKind: 'router',
  },
  {
    subject: 'Списание за услугу, которую я не подключал',
    description:
      'В личном кабинете появилось списание за дополнительную услугу, которую я не подключал. Прошу разобраться и вернуть деньги.',
    teamId: 'team-3',
    priorities: ['high', 'normal', 'high'],
    tags: ['биллинг', 'возврат'],
  },
  {
    subject: 'Оплата не отображается в личном кабинете',
    description:
      'Оплатил услуги через банк три часа назад, но баланс не изменился. Чек сохранился, готова приложить по запросу.',
    teamId: 'team-3',
    priorities: ['normal', 'normal', 'high'],
    tags: ['оплата', 'баланс'],
  },
  {
    subject: 'Доступ заблокирован при положительном балансе',
    description:
      'Доступ заблокирован, хотя на счёте положительный баланс. В личном кабинете вижу задолженность 0 ₽. Нужна помощь.',
    teamId: 'team-3',
    priorities: ['high', 'critical', 'normal'],
    tags: ['блокировка', 'баланс'],
  },
  {
    subject: 'Повреждён оптический кабель в подъезде',
    description:
      'В подъезде повредили оптический кабель во время ремонта. Соседи тоже без связи, на терминале горит LOS.',
    teamId: 'team-2',
    priorities: ['critical', 'critical', 'high'],
    tags: ['авария', 'оптика', 'подъезд'],
    assetKind: 'ont',
  },
  {
    subject: 'Не поднимается VPN-тоннель к офису',
    description:
      'С утра не поднимается VPN между головным офисом и складом. Сотрудники не могут открыть учётную систему. Локальный интернет работает.',
    teamId: 'team-4',
    priorities: ['critical', 'high', 'high'],
    tags: ['B2B', 'VPN', 'офис'],
    audience: 'business',
    assetKind: 'switch',
  },
  {
    subject: 'Статический IP перестал работать после замены роутера',
    description:
      'Заменили роутер, после этого недоступен статический IP и внешние сервисы. Настройки перенесли, но адрес не отвечает.',
    teamId: 'team-4',
    priorities: ['high', 'critical', 'normal'],
    tags: ['B2B', 'статический IP', 'роутер'],
    audience: 'business',
    assetKind: 'router',
  },
  {
    subject: 'Не показывают несколько ТВ-каналов',
    description:
      'Каналы из базового пакета показывают ошибку «Нет сигнала», остальные работают. Приставку перезагружали.',
    teamId: 'team-1',
    priorities: ['normal', 'low', 'normal'],
    tags: ['ТВ', 'приставка'],
    assetKind: 'stb',
  },
  {
    subject: 'IP-камера на объекте недоступна удалённо',
    description:
      'Камера на складе не открывается через мобильное приложение и по внешнему адресу. Локальная сеть офиса работает.',
    teamId: 'team-4',
    priorities: ['high', 'normal', 'high'],
    tags: ['B2B', 'камера', 'удалённый доступ'],
    audience: 'business',
    assetKind: 'camera',
  },
  {
    subject: 'Ограничение скорости на порту',
    description:
      'После переезда в новый офис скорость не превышает 100 Мбит/с. Тариф рассчитан на 500 Мбит/с, кабель Cat.5e.',
    teamId: 'team-2',
    priorities: ['normal', 'high'],
    tags: ['B2B', 'порт', 'скорость'],
    audience: 'business',
    assetKind: 'switch',
  },
  {
    subject: 'Нужны закрывающие документы за квартал',
    description:
      'Просим подготовить акт и УПД за третий квартал. Нужны копии с подписью и ЭДО, реквизиты не менялись.',
    teamId: 'team-4',
    priorities: ['low', 'normal', 'low'],
    tags: ['B2B', 'документы', 'биллинг'],
    audience: 'business',
  },
  {
    subject: 'Подключение нового офиса к сети',
    description:
      'Открываем второй офис, нужна консультация по подключению и корпоративному тарифу. В здании есть оптическая инфраструктура провайдера.',
    teamId: 'team-4',
    priorities: ['high', 'normal', 'normal'],
    tags: ['B2B', 'подключение', 'офис'],
    audience: 'business',
  },
  {
    subject: 'Не могу войти в личный кабинет',
    description:
      'При входе в личный кабинет получаю ошибку. Пароль сбрасывал, письмо с новым паролем не приходит уже час.',
    teamId: 'team-1',
    priorities: ['low', 'normal', 'normal'],
    tags: ['личный кабинет', 'доступ'],
  },
  {
    subject: 'Подозрительное письмо от имени провайдера',
    description:
      'Получил письмо с требованием срочно оплатить задолженность по ссылке. Отправитель похож на адрес провайдера, но домен отличается.',
    teamId: 'team-4',
    priorities: ['high', 'high', 'normal'],
    tags: ['безопасность', 'фишинг', 'email'],
  },
  {
    subject: 'Не открываются отдельные сайты',
    description:
      'Часть сайтов не открывается, при этом остальные работают. Смена браузера не помогла, антивирус отключал.',
    teamId: 'team-2',
    priorities: ['normal', 'normal', 'low'],
    tags: ['DNS', 'сайты'],
  },
  {
    subject: 'Красный индикатор LOS на терминале',
    description:
      'На оптическом терминале мигает красный LOS, интернета нет. Терминал перезагружали, патч-корд проверяли.',
    teamId: 'team-2',
    priorities: ['high', 'critical', 'normal'],
    tags: ['LOS', 'оптика', 'терминал'],
    assetKind: 'ont',
  },
  {
    subject: 'Не работает мобильное приложение провайдера',
    description:
      'После обновления приложение не открывает раздел платежей: появляется белый экран. Переустановка не помогла.',
    teamId: 'team-1',
    priorities: ['low', 'normal', 'low'],
    tags: ['приложение', 'оплата'],
  },
  {
    subject: 'Высокий пинг в вечернее время',
    description:
      'В играх пинг поднимается до 150–200 мс каждый вечер. Днём всё нормально. Подключение по кабелю.',
    teamId: 'team-2',
    priorities: ['normal', 'low', 'normal'],
    tags: ['пинг', 'игры'],
  },
  {
    subject: 'Соединение обрывается каждые 10 минут',
    description:
      'Интернет отключается примерно каждые 10 минут, через минуту восстанавливается. Роутер и терминал перезагружали.',
    teamId: 'team-2',
    priorities: ['high', 'normal', 'high'],
    tags: ['обрывы', 'стабильность'],
    assetKind: 'router',
  },
  {
    subject: 'Хочу сменить тариф на более быстрый',
    description:
      'Хочу перейти на тариф «Гигабит». Уточните стоимость и нужно ли менять оборудование. Лицевой счёт доступен.',
    teamId: 'team-3',
    priorities: ['low', 'low', 'normal'],
    tags: ['тариф', 'смена'],
  },
  {
    subject: 'Двойное списание с банковской карты',
    description:
      'В банковском приложении вижу два одинаковых списания за одну оплату. Одна операция завершена, вторая в обработке.',
    teamId: 'team-3',
    priorities: ['high', 'normal', 'high'],
    tags: ['двойное списание', 'возврат', 'оплата'],
  },
  {
    subject: 'Нужно расширить корпоративную подсеть',
    description:
      'Требуется блок адресов /29 для нового оборудования. Сейчас используем статический IP, договор действующий.',
    teamId: 'team-4',
    priorities: ['normal', 'low', 'normal'],
    tags: ['B2B', 'подсеть', 'статический IP'],
    audience: 'business',
  },
  {
    subject: 'Не приходит почта на корпоративный домен',
    description:
      'С утра внешние письма не доходят до сотрудников. Исходящие отправляются, внутренняя почта работает.',
    teamId: 'team-4',
    priorities: ['high', 'critical', 'high'],
    tags: ['B2B', 'почта', 'домен'],
    audience: 'business',
  },
  {
    subject: 'Авария на коммутаторе в бизнес-центре',
    description:
      'Не работает сеть на этаже, несколько арендаторов без доступа. Коммутатор в серверной не отвечает по управлению.',
    teamId: 'team-4',
    priorities: ['critical', 'critical', 'high'],
    tags: ['B2B', 'авария', 'коммутатор'],
    audience: 'business',
    assetKind: 'switch',
  },
  {
    subject: 'Как вернуть арендованное оборудование',
    description:
      'Отключаем услуги при переезде. Подскажите порядок возврата роутера и нужен ли акт приёма-передачи.',
    teamId: 'team-1',
    priorities: ['low', 'low', 'normal'],
    tags: ['оборудование', 'отключение'],
  },
  {
    subject: 'Заявка на выделенный статический IP',
    description:
      'Для нового сервера нужен статический IP. Уточните стоимость, сроки подключения и можно ли сохранить текущий адрес.',
    teamId: 'team-4',
    priorities: ['normal', 'low', 'normal'],
    tags: ['B2B', 'статический IP', 'сервер'],
    audience: 'business',
  },
  {
    subject: 'После плановых работ нет связи',
    description:
      'Ночью были плановые работы, утром интернет не заработал. Индикатор PON не горит, терминал перезагружали.',
    teamId: 'team-2',
    priorities: ['high', 'critical', 'normal'],
    tags: ['плановые работы', 'нет связи'],
    assetKind: 'ont',
  },
];

const FIRST_REPLIES: readonly ((name: string) => string)[] = [
  (name) =>
    `Здравствуйте, ${name}! Заявка принята в работу. Проверяю линию и оборудование, вернусь с результатом после диагностики.`,
  (name) =>
    `Добрый день, ${name}! Спасибо за обращение. Подключаюсь к диагностике, уточню данные и сообщу о результате в этой заявке.`,
  (name) =>
    `Здравствуйте, ${name}! Вижу обращение. Начинаю проверку по вашему лицевому счёту, пожалуйста, оставайтесь на связи.`,
  (name) =>
    `${name}, здравствуйте! Заявка зарегистрирована. Проверяю состояние услуги и оборудования, вернусь с ответом в течение рабочего времени.`,
];

const SECOND_AGENT_REPLIES: readonly string[] = [
  'Проверил параметры порта — сигнал в норме, ошибок на линии не вижу. Продолжаю проверку со стороны домашнего оборудования.',
  'По данным мониторинга кратковременные обрывы были, но сейчас сессия стабильна. Сделал пометку для сетевой команды.',
  'Обновил информацию по заявке. Проблема требует выезда инженера, согласовываю удобное время.',
  'Спасибо за ожидание. Проверил настройки на стороне провайдера, они корректны. Уточните, пожалуйста, текущее состояние индикаторов.',
  'Нашёл возможную причину и передал данные профильному специалисту. Держу заявку на контроле.',
  'Проверил баланс и состояние услуги — ограничений нет. Попробуйте, пожалуйста, ещё раз и напишите результат.',
];

const CLIENT_FOLLOWUPS: readonly string[] = [
  'Спасибо, сейчас проверю и напишу.',
  'Проблема сохраняется, перезагрузка не помогла.',
  'Добрый день! Есть какие-то новости по заявке?',
  'Кажется, стало лучше. Понаблюдаю в течение дня.',
  'Индикатор теперь горит зелёным, интернет появился. Спасибо!',
  'Уточните, пожалуйста, когда сможет приехать инженер?',
];

const INTERNAL_NOTES: readonly string[] = [
  'Созвон с клиентом состоялся. Подтвердил проблему, договорились о диагностике.',
  'Проверил историю обращений: похожий случай был три недели назад, тогда меняли патч-корд.',
  'Эскалировал в сетевую команду, приложил результаты трассировки и состояние порта.',
  'Клиент просил перезвонить после 18:00, в заявке указал удобное время.',
  'Перед выездом проверить баланс и состояние услуги. Доступ в подъезд через управляющую компанию.',
  'SLA под угрозой, подключил старшего инженера к разбору.',
  'Нужно согласовать замену оборудования с руководителем смены.',
  'Клиент прислал фото индикаторов, LOS не горит. Передано в первую линию для повторной диагностики.',
];

interface AssetTemplate {
  kind: AssetKind;
  model: string;
  firmware: string;
}

const ASSET_TEMPLATES: readonly AssetTemplate[] = [
  { kind: 'router', model: 'Keenetic Giga KN-1011', firmware: '4.2.1' },
  { kind: 'ont', model: 'Huawei HG8245H', firmware: 'V3R017C10S211' },
  { kind: 'router', model: 'TP-Link Archer AX55', firmware: '1.3.2' },
  { kind: 'stb', model: 'Eltex NV-501', firmware: '2.0.8' },
  { kind: 'camera', model: 'Hikvision DS-2CD1023G0E-I', firmware: '5.7.3' },
  { kind: 'switch', model: 'TP-Link TL-SG1024D', firmware: '1.0.4' },
  { kind: 'ont', model: 'Sercomm RV6699', firmware: '3.1.0' },
  { kind: 'router', model: 'MikroTik hAP ac³', firmware: '7.16.2' },
  { kind: 'ont', model: 'Eltex NTU-RG-1402G-W', firmware: '2.4.1' },
  { kind: 'router', model: 'D-Link DIR-825', firmware: '4.0.1' },
  { kind: 'stb', model: 'Eltex NV-711', firmware: '1.9.6' },
  { kind: 'switch', model: 'Cisco SG250-08', firmware: '2.5.0.88' },
];

const ASSET_CLIENTS = [
  'client-01',
  'client-02',
  'client-03',
  'client-04',
  'client-05',
  'client-06',
  'client-07',
  'client-08',
  'client-09',
  'client-10',
  'client-01',
  'client-06',
];

const ASSET_STATUSES: readonly AssetStatus[] = [
  'online',
  'online',
  'online',
  'online',
  'online',
  'offline',
  'online',
  'online',
  'maintenance',
  'online',
  'online',
  'offline',
];

function buildClients(rng: RandomSource, nowMs: number): Client[] {
  const clients: Client[] = [];
  const usedNames = new Set<string>();

  BUSINESS_CLIENTS.forEach((business, index) => {
    const id = `client-${pad(index + 1, 2)}`;
    const street = rng.pick(STREETS);
    const number = rng.int(2, 84);
    const status = index === 6 ? 'suspended' : 'active';
    const balance = status === 'suspended' ? -rng.int(120, 1400) : rng.int(0, 4200);
    clients.push({
      id,
      kind: 'business',
      name: business.company,
      company: business.company,
      contactName: business.contact,
      email: `info${index + 1}@example.com`,
      phone: `+7 (900) 000-${pad(index + 1, 2)}-${pad(rng.int(10, 99), 2)}`,
      address: `г. ${business.city}, ул. ${street}, д. ${number}, офис ${rng.int(2, 30)}`,
      accountNumber: `ЛС-${100000 + index * 137}`,
      tariff: rng.pick(BUSINESS_TARIFFS),
      balance,
      status,
      createdAt: toIso(nowMs - rng.int(120, 1500) * DAY_MS),
      notes:
        index === 0
          ? 'Договор на 6 офисных подключений. Персональный менеджер — Ольга Виноградова.'
          : index === 4
            ? 'Приоритетный B2B-клиент, SLA с реакцией 30 минут в рабочее время.'
            : 'Контакт по техническим вопросам — указанное контактное лицо.',
    });
  });

  while (clients.length < CLIENT_COUNT) {
    const female = rng.chance(0.5);
    const firstName = rng.pick(female ? FEMALE_NAMES : MALE_NAMES);
    const baseSurname = rng.pick(MALE_SURNAMES);
    const surname = female ? femaleSurname(baseSurname) : baseSurname;
    const fullName = `${firstName} ${surname}`;
    if (usedNames.has(fullName)) continue;

    usedNames.add(fullName);
    const index = clients.length;
    const city = rng.pick(CITIES);
    const street = rng.pick(STREETS);
    const status = index === 23 ? 'suspended' : 'active';
    const notes = rng.pick(CLIENT_NOTES);
    clients.push({
      id: `client-${pad(index + 1, 2)}`,
      kind: 'individual',
      name: fullName,
      company: null,
      contactName: null,
      email: `${transliterate(firstName)}.${transliterate(surname)}@example.com`,
      phone: `+7 (900) 000-${pad(index + 1, 2)}-${pad(rng.int(10, 99), 2)}`,
      address: `г. ${city}, ул. ${street}, д. ${rng.int(2, 96)}, кв. ${rng.int(1, 210)}`,
      accountNumber: `ЛС-${200000 + index * 173}`,
      tariff: rng.pick(HOME_TARIFFS),
      balance: status === 'suspended' ? -rng.int(90, 900) : rng.int(-300, 2600),
      status,
      createdAt: toIso(nowMs - rng.int(60, 1700) * DAY_MS),
      notes,
    });
  }

  return clients;
}

function buildAssets(rng: RandomSource, nowMs: number): Asset[] {
  return ASSET_TEMPLATES.map((template, index) => {
    const installedDays = rng.int(40, 900);
    return {
      id: `asset-${pad(index + 1, 2)}`,
      clientId: ASSET_CLIENTS[index],
      kind: template.kind,
      model: template.model,
      serial: `${template.kind.toUpperCase()}-${pad(rng.int(100000, 999999), 6)}`,
      installedAt: toIso(nowMs - installedDays * DAY_MS),
      status: ASSET_STATUSES[index],
      ipAddress: `10.20.${rng.int(10, 40)}.${rng.int(2, 240)}`,
      firmware: template.firmware,
    };
  });
}

function statusDeck(): TicketStatus[] {
  const deck: TicketStatus[] = [
    ...Array<TicketStatus>(14).fill('new'),
    ...Array<TicketStatus>(32).fill('open'),
    ...Array<TicketStatus>(18).fill('pending'),
    ...Array<TicketStatus>(38).fill('resolved'),
    ...Array<TicketStatus>(18).fill('closed'),
  ];
  return deck;
}

function shuffle<T>(items: readonly T[], rng: RandomSource): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(0, index);
    const current = result[index];
    result[index] = result[swapIndex];
    result[swapIndex] = current;
  }
  return result;
}

function pickChannel(rng: RandomSource): TicketChannel {
  const roll = rng.next();
  if (roll < 0.36) return 'phone';
  if (roll < 0.65) return 'email';
  if (roll < 0.84) return 'chat';
  return 'portal';
}

function firstNameOf(value: string): string {
  return value.split(' ')[0] ?? value;
}

function buildTickets(
  rng: RandomSource,
  nowMs: number,
  clients: readonly Client[],
  assets: readonly Asset[],
  messages: Message[],
  activities: ActivityEvent[],
): Ticket[] {
  const statuses = shuffle(statusDeck(), rng);
  const scenarios = shuffle(
    Array.from({ length: TICKET_COUNT }, (_, index) => SCENARIOS[index % SCENARIOS.length]),
    rng,
  );
  const tickets: Ticket[] = [];
  let messageSequence = 0;
  let activitySequence = 0;

  const addMessage = (
    ticketId: string,
    authorType: Message['authorType'],
    authorId: string | null,
    authorName: string,
    body: string,
    atMs: number,
    internal: boolean,
  ): Message => {
    messageSequence += 1;
    const message: Message = {
      id: `message-${pad(messageSequence)}`,
      ticketId,
      authorType,
      authorId,
      authorName,
      body,
      createdAt: toIso(atMs),
      internal,
    };
    messages.push(message);
    return message;
  };

  const addActivity = (
    type: ActivityType,
    ticketId: string | null,
    clientId: string | null,
    actorName: string,
    text: string,
    atMs: number,
  ): void => {
    activitySequence += 1;
    activities.push({
      id: `activity-${pad(activitySequence)}`,
      type,
      ticketId,
      clientId,
      actorName,
      text,
      createdAt: toIso(atMs),
    });
  };

  for (let index = 0; index < TICKET_COUNT; index += 1) {
    const scenario = scenarios[index];
    const status = statuses[index];
    const priority = rng.pick(scenario.priorities);
    const policy = getSlaPolicy(priority, DEFAULT_SLA_POLICIES);
    const eligibleClients = scenario.audience
      ? clients.filter((client) => client.kind === scenario.audience)
      : clients;
    const client = rng.pick(eligibleClients);
    const teamAgents = AGENTS.filter((agent) => agent.teamId === scenario.teamId);
    const assignee = rng.chance(status === 'new' ? 0.72 : 0.93) ? rng.pick(teamAgents) : null;
    const team = TEAMS.find((item) => item.id === scenario.teamId);
    if (!team) {
      throw new Error(`Unknown team in scenario: ${scenario.teamId}`);
    }

    const active = status === 'new' || status === 'open' || status === 'pending';
    let ageMinutes: number;
    if (status === 'new') {
      ageMinutes = rng.int(5, 175);
    } else if (status === 'open') {
      ageMinutes = rng.int(70, 38 * 60);
    } else if (status === 'pending') {
      ageMinutes = rng.int(90, 30 * 60);
    } else if (status === 'resolved') {
      ageMinutes = rng.int(2 * 24 * 60, 26 * 24 * 60);
    } else {
      ageMinutes = rng.int(4 * 24 * 60, 29 * 24 * 60);
    }

    if (active) {
      if (rng.chance(0.12)) {
        ageMinutes = rng.int(policy.resolutionMinutes * 1.1, policy.resolutionMinutes * 2.1);
      } else {
        const normalCeiling = Math.max(15, Math.round(policy.resolutionMinutes * 0.88));
        ageMinutes = Math.min(ageMinutes, rng.int(10, normalCeiling));
      }
    }

    const createdAtMs = nowMs - Math.round(ageMinutes) * MINUTE_MS;
    const clientDisplayName =
      client.kind === 'business' ? (client.contactName ?? client.name) : client.name;
    const clientFirstName = firstNameOf(clientDisplayName);
    const ticketId = `ticket-${pad(index + 1)}`;
    const number = `TS-${2400 + index}`;
    const ticketAsset = pickAssetForTicket(rng, client, assets, scenario.assetKind);
    const channel = pickChannel(rng);
    const clientMessagesStart = createdAtMs;

    addMessage(
      ticketId,
      'client',
      client.id,
      clientDisplayName,
      scenario.description,
      clientMessagesStart,
      false,
    );

    const shouldRespond =
      status === 'resolved' || status === 'closed' || status === 'pending'
        ? true
        : status === 'open'
          ? rng.chance(0.9)
          : false;

    let responseDelayMinutes = 0;
    let firstRespondedAtMs: number | null = null;
    let firstResponder =
      assignee ?? (teamAgents.length > 0 ? teamAgents[0] : AGENTS[0]);

    if (shouldRespond) {
      const breach = rng.chance(0.16);
      responseDelayMinutes = breach
        ? rng.int(policy.responseMinutes + 5, policy.responseMinutes * 2.2)
        : rng.int(3, Math.max(5, Math.floor(policy.responseMinutes * 0.72)));
      const maxDelay = Math.max(1, ageMinutes - 4);
      responseDelayMinutes = Math.min(responseDelayMinutes, maxDelay);
      const candidate = addMinutes(createdAtMs, responseDelayMinutes);
      if (candidate < nowMs - 30_000) {
        firstRespondedAtMs = candidate;
      }
    }

    if (firstRespondedAtMs !== null) {
      if (!assignee && teamAgents.length > 0) {
        firstResponder = rng.pick(teamAgents);
      }
      const replyTemplate = rng.pick(FIRST_REPLIES);
      addMessage(
        ticketId,
        'agent',
        firstResponder.id,
        firstResponder.name,
        replyTemplate(clientFirstName),
        firstRespondedAtMs,
        false,
      );
      addActivity(
        'message_added',
        ticketId,
        client.id,
        firstResponder.name,
        `Первый ответ клиенту по заявке ${number}`,
        firstRespondedAtMs,
      );
    }

    let resolvedAtMs: number | null = null;
    let closedAtMs: number | null = null;

    if (status === 'resolved' || status === 'closed') {
      const resolutionBreach = rng.chance(0.17);
      let resolutionDelay = resolutionBreach
        ? rng.int(policy.resolutionMinutes * 1.15, policy.resolutionMinutes * 2.1)
        : rng.int(policy.resolutionMinutes * 0.25, policy.resolutionMinutes * 0.9);
      resolutionDelay = Math.min(resolutionDelay, Math.max(5, ageMinutes - 30));
      resolutionDelay = Math.max(resolutionDelay, responseDelayMinutes + 25);
      let resolvedCandidate = addMinutes(createdAtMs, resolutionDelay);
      resolvedCandidate = Math.min(resolvedCandidate, nowMs - 60_000);
      resolvedAtMs = Math.max(resolvedCandidate, createdAtMs + 10 * MINUTE_MS);
      if (resolvedAtMs > nowMs) {
        resolvedAtMs = nowMs - 60_000;
      }

      if (status === 'closed') {
        closedAtMs = Math.min(resolvedAtMs + rng.int(15, 180) * MINUTE_MS, nowMs - 30_000);
      }
    }

    const timeLimit = resolvedAtMs ?? nowMs - 120_000;
    if (firstRespondedAtMs !== null && timeLimit - firstRespondedAtMs > 50 * MINUTE_MS) {
      if (rng.chance(status === 'resolved' || status === 'closed' ? 0.5 : 0.34)) {
        const clientReplyMs = Math.min(
          firstRespondedAtMs + rng.int(20, 180) * MINUTE_MS,
          timeLimit - 30 * MINUTE_MS,
        );
        if (clientReplyMs > firstRespondedAtMs) {
          addMessage(
            ticketId,
            'client',
            client.id,
            clientDisplayName,
            rng.pick(CLIENT_FOLLOWUPS),
            clientReplyMs,
            false,
          );
          if (timeLimit - clientReplyMs > 30 * MINUTE_MS && rng.chance(0.7)) {
            const agentReplyMs = Math.min(
              clientReplyMs + rng.int(10, 90) * MINUTE_MS,
              timeLimit - 10 * MINUTE_MS,
            );
            const responder = assignee ?? firstResponder;
            addMessage(
              ticketId,
              'agent',
              responder.id,
              responder.name,
              rng.pick(SECOND_AGENT_REPLIES),
              agentReplyMs,
              false,
            );
          }
        }
      }
    }

    if (rng.chance(0.56)) {
      const noteUpperBound = Math.max(createdAtMs + MINUTE_MS, timeLimit - 5 * MINUTE_MS);
      const internalNoteAtMs = rng.int(createdAtMs + MINUTE_MS, noteUpperBound);
      const noteAuthor = assignee ?? firstResponder;
      addMessage(
        ticketId,
        'agent',
        noteAuthor.id,
        noteAuthor.name,
        rng.pick(INTERNAL_NOTES),
        internalNoteAtMs,
        true,
      );
      addActivity(
        'note_added',
        ticketId,
        client.id,
        noteAuthor.name,
        `Внутренняя заметка к заявке ${number}`,
        internalNoteAtMs,
      );
    }

    if (closedAtMs !== null) {
      addMessage(
        ticketId,
        'system',
        null,
        'Система',
        'Заявка закрыта после подтверждения результата клиентом.',
        closedAtMs,
        false,
      );
    }

    const ticketMessageTimes = messages
      .filter((message) => message.ticketId === ticketId)
      .map((message) => new Date(message.createdAt).getTime());
    const updatedAtMs = Math.max(
      createdAtMs,
      firstRespondedAtMs ?? createdAtMs,
      resolvedAtMs ?? createdAtMs,
      closedAtMs ?? createdAtMs,
      ...ticketMessageTimes,
    );

    const tags = [...scenario.tags];
    if (client.kind === 'business' && !tags.includes('B2B')) {
      tags.push('B2B');
    }

    const ticket: Ticket = {
      id: ticketId,
      number,
      subject: scenario.subject,
      description: scenario.description,
      clientId: client.id,
      assetId: ticketAsset?.id ?? null,
      teamId: scenario.teamId,
      assigneeId: assignee?.id ?? null,
      status,
      priority,
      channel,
      tags,
      createdAt: toIso(createdAtMs),
      updatedAt: toIso(updatedAtMs),
      firstRespondedAt: firstRespondedAtMs === null ? null : toIso(firstRespondedAtMs),
      resolvedAt: resolvedAtMs === null ? null : toIso(resolvedAtMs),
      closedAt: closedAtMs === null ? null : toIso(closedAtMs),
    };
    tickets.push(ticket);

    addActivity(
      'ticket_created',
      ticketId,
      client.id,
      clientDisplayName,
      `Создана заявка ${number}: ${scenario.subject}`,
      createdAtMs,
    );

    if (assignee) {
      addActivity(
        'assigned',
        ticketId,
        client.id,
        'Маршрутизатор',
        `Заявка ${number} назначена на ${assignee.name}`,
        createdAtMs + rng.int(1, 3) * MINUTE_MS,
      );
    }

    if (resolvedAtMs !== null) {
      addActivity(
        'resolved',
        ticketId,
        client.id,
        firstResponder.name,
        `Заявка ${number} переведена в статус «Решена»`,
        resolvedAtMs,
      );
    }

    if (closedAtMs !== null) {
      addActivity(
        'status_changed',
        ticketId,
        client.id,
        'Система',
        `Заявка ${number} закрыта`,
        closedAtMs,
      );
    }
  }

  return tickets;
}

function pickAssetForTicket(
  rng: RandomSource,
  client: Client,
  assets: readonly Asset[],
  preferredKind?: AssetKind,
): Asset | null {
  const clientAssets = assets.filter((asset) => asset.clientId === client.id);
  if (clientAssets.length === 0) return null;
  if (preferredKind) {
    const preferred = clientAssets.find((asset) => asset.kind === preferredKind);
    if (preferred) return preferred;
  }
  return rng.chance(0.28) ? rng.pick(clientAssets) : null;
}

export function generateDemoData(options: SeedOptions = {}): CrmSnapshot {
  const seed = options.seed ?? DEMO_SEED;
  const now = options.now ?? new Date();
  const nowMs = Math.floor(now.getTime() / 1000) * 1000;
  const rng = createPrng(seed);
  const clients = buildClients(rng, nowMs);
  const assets = buildAssets(rng, nowMs);
  const messages: Message[] = [];
  const activities: ActivityEvent[] = [];
  const tickets = buildTickets(rng, nowMs, clients, assets, messages, activities);
  const kbArticles: KbArticle[] = createKbArticles(nowMs);

  return {
    teams: TEAMS,
    agents: AGENTS,
    clients,
    assets,
    tickets: tickets.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
    messages: messages.sort(
      (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    ),
    kbArticles,
    slaPolicies: DEFAULT_SLA_POLICIES,
    activities: activities.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    ),
    seededAt: toIso(nowMs),
  };
}
