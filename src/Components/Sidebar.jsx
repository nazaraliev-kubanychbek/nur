import {
  Instagram,
  InstagramIcon,
  Landmark,
  ScaleIcon,
  Users,
  Warehouse,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BsFileEarmarkPerson, BsListCheck } from "react-icons/bs";
import {
  FaBoxOpen,
  FaBuilding,
  FaCashRegister,
  FaChalkboardTeacher,
  FaChartLine,
  FaClipboardList,
  FaCog,
  FaCogs,
  FaComments,
  FaExchangeAlt,
  FaMoneyBill,
  FaRegCalendarAlt,
  FaRegChartBar,
  FaRegClipboard,
  FaRegListAlt,
  FaRegUser,
  FaShoppingCart,
  FaTags,
  FaTrashAlt,
  FaTruckLoading,
  FaUsers,
  FaWarehouse,
} from "react-icons/fa";
import { NavLink } from "react-router-dom";
import "./Sidebar.scss";

import { MdDocumentScanner } from "react-icons/md";
import { useUser } from "../store/slices/userSlice";
import Lang from "./Lang/Lang";
import arnament1 from "./Photo/Group 1203.png";
import arnament2 from "./Photo/Group 1204 (1).png";
import Logo from "./Photo/logo2.png";

// --- API Configuration ---
const BASE_URL = "https://app.nurcrm.kg/api";

const HIDE_RULES = [
  {
    when: { tariff: "Старт" },
    hide: {
      labels: [
        "Обзор",
        "Закупки",
        "Сотрудники",
        "Бронирование",
        "Клиенты",
        "Отделы",
        "Аналитика Отделов",
      ],
    },
  },

  {
    when: { sector: "Кафе" },
    hide: {
      toIncludes: [
        "/crm/zakaz",
        "/crm/cafe/analytics",
        "/crm/kassa",
        "/crm/cafe/reports",
        "/crm/sell",
        "/crm/cafe/payroll",
        "/crm/obzor",
        "/crm/raspisanie",
        "/crm/sklad",
        "/crm/cafe/reservation",
        "/crm/cafe/purchasing",
        "/crm/analytics",
        "/crm/debts",
      ],
    },
    show: { toIncludes: ["/crm/sklad"] },
  },

  {
    when: { sector: "Гостиница" },
    hide: {
      toIncludes: [
        "crm/analytics",
        "/crm/hostel/clients",
        "/crm/hostel/bar",
        "/crm/zakaz",
        "/crm/hostel/obzor",
        "/crm/kassa",
        "/crm/sell",
        "/crm/obzor",
        "/crm/raspisanie",
        "/crm/hostel/analytics",
        "/crm/debts",
      ],
    },
  },

  {
    when: { sector: "Барбершоп" },
    hide: {
      toIncludes: [
        "crm/employ",
        "crm/clients",
        "crm/analytics",
        "/crm/barber/history",
        "crm/kassa",
        "/crm/obzor",
        "/crm/zakaz",
        "crm/raspisanie",
        "/crm/debts",
      ],
    },
  },

  {
    when: { sector: "Школа" },
    hide: {
      toIncludes: [
        "/crm/zakaz",
        "/crm/obzor",
        "crm/clients",
        "crm/analytics",
        "crm/employ",
        "crm/kassa",
        "crm/raspisanie",
        "/crm/debts",
      ],
    },
  },

  {
    when: { sector: "Магазин" },
    hide: {
      toIncludes: [
        "/crm/obzor",
        "/crm/zakaz",
        "/crm/market/analytics",
        "/crm/market/bar",
        "/crm/market/history",
        "/crm/raspisanie",
      ],
    },
  },

  {
    when: { sector: "Строительная компания" },
    hide: {
      toIncludes: ["/crm/debts", "/crm/obzor"],
    },
  },
  {
    when: { sector: "Консалтинг" },
    hide: {
      toIncludes: [
        "/crm/debts",
        "/crm/obzor",
        "/crm/brand-category",
        "/crm/clients",
        "/crm/sell",
        // "/crm/kassa",
        "/crm/employ",
        "/crm/sklad",
        "/crm/zakaz",
        "/crm/analytics",
        "/crm/consulting/kassa",
        "/crm/raspisanie",
      ],
    },
  },
  {
    when: { sector: "Склад" },
    hide: {
      toIncludes: [
        "/crm/debts",
        "/crm/obzor",
        "/crm/brand-category",
        "/crm/clients",
        "/crm/sell",
        // "/crm/kassa",
        // "/crm/employ",
        "/crm/sklad",
        "/crm/zakaz",
        "/crm/analytics",
        "/crm/raspisanie",
      ],
    },
  },
  {
    when: { sector: "Производство" },
    hide: {
      toIncludes: [
        "/crm/debts",
        "/crm/obzor",
        "/crm/zakaz",
        "/crm/sklad",
        "/crm/raspisanie",
      ],
    },
  },
];

/**
 * Конфигурация меню на основе backend permissions
 * Каждый пункт меню привязан к конкретному permission из backend
 */
const MENU_CONFIG = {
  // Основные разделы (базовые permissions)
  basic: [
    {
      label: "Обзор",
      to: "/crm/obzor",
      icon: <FaRegClipboard className="sidebar__menu-icon" />,
      permission: "can_view_dashboard",
      implemented: true,
    },
    {
      label: "Закупки",
      to: "/crm/zakaz",
      icon: <FaRegListAlt className="sidebar__menu-icon" />,
      permission: "can_view_orders",
      implemented: true,
    },
    {
      label: "Продажа",
      to: "/crm/sell",
      icon: <ScaleIcon className="sidebar__menu-icon" />,
      permission: "can_view_sale",
      implemented: true,
    },
    {
      label: "Аналитика",
      to: "/crm/analytics",
      icon: <FaRegChartBar className="sidebar__menu-icon" />,
      permission: "can_view_analytics",
      implemented: true,
    },
    {
      label: "Склад",
      to: "/crm/sklad",
      icon: <Warehouse className="sidebar__menu-icon" />,
      permission: "can_view_products",
      implemented: true,
    },
    {
      label: "Касса",
      to: "/crm/kassa",
      icon: <Landmark className="sidebar__menu-icon" />,
      permission: "can_view_cashbox",
      implemented: true,
    },
    {
      label: "Сотрудники",
      to: "/crm/employ",
      icon: <FaRegUser className="sidebar__menu-icon" />,
      permission: "can_view_employees",
      implemented: true,
    },
    {
      label: "Бронирование",
      to: "/crm/raspisanie",
      icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
      permission: "can_view_booking",
      implemented: true,
    },
    {
      label: "Клиенты",
      to: "/crm/clients",
      icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
      permission: "can_view_clients",
      implemented: true,
    },
    {
      label: "Отделы",
      to: "/crm/departments",
      icon: <Users className="sidebar__menu-icon" />,
      permission: "can_view_departments",
      implemented: true,
    },
    {
      label: "Долги",
      to: "/crm/debts",
      icon: <Users className="sidebar__menu-icon" />,
      permission: "can_view_debts",
      implemented: true,
    },
    {
      label: "Бренд,Категория",
      to: "/crm/brand-category",
      icon: <Instagram className="sidebar__menu-icon" />,
      permission: "can_view_brand_category",
      implemented: true,
    },
    {
      label: "Настройки",
      to: "/crm/set",
      icon: <FaCog className="sidebar__menu-icon" />,
      permission: "can_view_settings",
      implemented: true,
    },
  ],

  // Секторные разделы (permissions с префиксами)
  sector: {
    // Строительная сфера
    building: [
      {
        label: "Процесс работы",
        to: "/crm/building/work",
        icon: <BsListCheck className="sidebar__menu-icon" />,
        permission: "can_view_building_work_process",
        implemented: true,
      },
      {
        label: "Квартиры",
        to: "/crm/building/objects",
        icon: <FaBuilding className="sidebar__menu-icon" />,
        permission: "can_view_building_objects",
        implemented: true,
      },
    ],

    // Барбершоп
    barber: [
      {
        label: "Клиенты",
        to: "/crm/barber/clients",
        icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
        permission: "can_view_barber_clients",
        implemented: true,
      },
      {
        label: "Услуги",
        to: "/crm/barber/services",
        icon: <FaTags className="sidebar__menu-icon" />,
        permission: "can_view_barber_services",
        implemented: true,
      },
      {
        label: "Мастера",
        to: "/crm/barber/masters",
        icon: <FaRegUser className="sidebar__menu-icon" />,
        permission: "can_view_employees", // Используем базовый permission
        implemented: true,
      },
      {
        label: "История",
        to: "/crm/barber/history",
        icon: <FaRegClipboard className="sidebar__menu-icon" />,
        permission: "can_view_barber_history",
        implemented: true,
      },
      {
        label: "Записи",
        to: "/crm/barber/records",
        icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
        permission: "can_view_barber_records",
        implemented: true,
      },
      {
        label: "Аналитика",
        to: "/crm/barber/cash-reports",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_cashbox", // Используем базовый permission
        implemented: true,
      },
    ],

    // Гостиница
    hostel: [
      {
        label: "Комнаты",
        to: "/crm/hostel/rooms",
        icon: <FaRegListAlt className="sidebar__menu-icon" />,
        permission: "can_view_hostel_rooms",
        implemented: true,
      },
      {
        label: "Бронирования",
        to: "/crm/hostel/bookings",
        icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
        permission: "can_view_hostel_booking",
        implemented: true,
      },
      {
        label: "Бар",
        to: "/crm/hostel/bar",
        icon: <FaRegClipboard className="sidebar__menu-icon" />,
        permission: "can_view_booking", // Используем базовый permission
        implemented: true,
      },
      {
        label: "Клиенты",
        to: "/crm/hostel/clients",
        icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
        permission: "can_view_hostel_clients",
        implemented: true,
      },
      {
        label: "Аналитика",
        to: "/crm/hostel/analytics",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_hostel_analytics",
        implemented: true,
      },
      {
        label: "Касса",
        to: "/crm/hostel/kassa",
        icon: <Landmark className="sidebar__menu-icon" />,
        permission: "can_view_cashbox", // Используем базовый permission
        implemented: true,
      },
    ],

    // Школа
    school: [
      {
        label: "Ученики",
        to: "/crm/school/students",
        icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
        permission: "can_view_school_students",
        implemented: true,
      },
      {
        label: "Направления",
        to: "/crm/school/groups",
        icon: <FaRegListAlt className="sidebar__menu-icon" />,
        permission: "can_view_school_groups",
        implemented: true,
      },
      {
        label: "Уроки",
        to: "/crm/school/lessons",
        icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
        permission: "can_view_school_lessons",
        implemented: true,
      },
      {
        label: "Сотрудники",
        to: "/crm/school/teachers",
        icon: <FaRegUser className="sidebar__menu-icon" />,
        permission: "can_view_school_teachers",
        implemented: true,
      },
      {
        label: "Заявки",
        to: "/crm/school/leads",
        icon: <FaComments className="sidebar__menu-icon" />,
        permission: "can_view_school_leads",
        implemented: true,
      },
      {
        label: "Аналитика",
        to: "/crm/school/invoices",
        icon: <FaRegClipboard className="sidebar__menu-icon" />,
        permission: "can_view_school_invoices",
        implemented: true,
      },
    ],

    // Магазин
    market: [
      {
        label: "Бар",
        to: "/crm/market/bar",
        icon: <FaRegListAlt className="sidebar__menu-icon" />,
        permission: "can_view_products", // Используем базовый permission
        implemented: true,
      },
      {
        label: "История",
        to: "/crm/market/history",
        icon: <FaRegClipboard className="sidebar__menu-icon" />,
        permission: "can_view_orders", // Используем базовый permission
        implemented: true,
      },
      {
        label: "Аналитика",
        to: "/crm/market/analytics",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_analytics", // Используем базовый permission
        implemented: true,
      },
    ],

    // Кафе
    cafe: [
      {
        label: "Аналитика выплат",
        to: "/crm/cafe/analytics",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_analytics", // Используем базовый permission
        implemented: true,
      },
      {
        label: "Меню",
        to: "/crm/cafe/menu",
        icon: <FaRegListAlt className="sidebar__menu-icon" />,
        permission: "can_view_cafe_menu",
        implemented: true,
      },
      {
        label: "Заказы",
        to: "/crm/cafe/orders",
        icon: <FaRegListAlt className="sidebar__menu-icon" />,
        permission: "can_view_cafe_orders",
        implemented: true,
      },
      {
        label: "Зарплата",
        to: "/crm/cafe/payroll",
        icon: <FaRegUser className="sidebar__menu-icon" />,
        permission: "can_view_employees", // Используем базовый permission
        implemented: true,
      },
      {
        label: "Закупки",
        to: "/crm/cafe/purchasing",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_cafe_purchasing",
        implemented: true,
      },
      {
        label: "Отчёты",
        to: "/crm/cafe/reports",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_analytics", // Используем базовый permission
        implemented: true,
      },
      {
        label: "Бронь",
        to: "/crm/cafe/reservations",
        icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
        permission: "can_view_cafe_booking",
        implemented: true,
      },
      {
        label: "Гости",
        to: "/crm/cafe/clients",
        icon: <FaRegUser className="sidebar__menu-icon" />,
        permission: "can_view_cafe_clients",
        implemented: true,
      },
      {
        label: "Склад",
        to: "/crm/cafe/stock",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_products",
        implemented: true,
      },
      {
        label: "Столы",
        to: "/crm/cafe/tables",
        icon: <FaRegListAlt className="sidebar__menu-icon" />,
        permission: "can_view_cafe_tables",
        implemented: true,
      },
      {
        label: "Касса",
        to: "/crm/cafe/kassa",
        icon: <Landmark className="sidebar__menu-icon" />,
        permission: "can_view_cashbox", // Используем базовый permission
        implemented: true,
      },
    ],

    consulting: [
      {
        label: "Аналитика",
        to: "/crm/consulting/analytics",
        icon: <FaRegChartBar className="sidebar__menu-icon" />,
        permission: "can_view_analytics",
        implemented: true,
      },
      {
        label: "Клиенты",
        to: "/crm/consulting/client",
        icon: <FaUsers className="sidebar__menu-icon" />,
        permission: "can_view_clients",
        implemented: true,
      },
      {
        label: "Запросы клиентов",
        to: "/crm/consulting/client-requests",
        icon: <FaClipboardList className="sidebar__menu-icon" />,
        permission: "can_view_client_requests",
        implemented: true,
      },
      {
        label: "Касса",
        to: "/crm/consulting/kassa",
        icon: <FaCashRegister className="sidebar__menu-icon" />,
        permission: "can_view_cashbox",
        implemented: true,
      },
      {
        label: "Сотрудники",
        to: "/crm/consulting/teachers",
        icon: <FaChalkboardTeacher className="sidebar__menu-icon" />,
        permission: "can_view_employees",
        implemented: true,
      },
      {
        label: "Зарплата",
        to: "/crm/consulting/salary",
        icon: <FaMoneyBill className="sidebar__menu-icon" />,
        permission: "can_view_salary",
        implemented: true,
      },
      {
        label: "Продажи",
        to: "/crm/consulting/sale",
        icon: <FaShoppingCart className="sidebar__menu-icon" />,
        permission: "can_view_sale",
        implemented: true,
      },
      {
        label: "Услуги",
        to: "/crm/consulting/services",
        icon: <FaCogs className="sidebar__menu-icon" />,
        permission: "can_view_services",
        implemented: true,
      },
      {
        label: "Бронирование",
        to: "/crm/consulting/bookings",
        icon: <FaRegCalendarAlt className="sidebar__menu-icon" />,
        permission: "can_view_booking",
        implemented: true,
      },
    ],
    warehouse: [
      {
        label: "Клиенты",
        to: "/crm/warehouse/clients",
        icon: <FaUsers className="sidebar__menu-icon" />, // 👥
        permission: "can_view_clients",
        implemented: true,
      },
      {
        label: "Аналитика",
        to: "/crm/warehouse/analytics",
        icon: <FaChartLine className="sidebar__menu-icon" />, // 📈
        permission: "can_view_analytics",
        implemented: true,
      },
      {
        label: "Товары",
        to: "/crm/warehouse/products",
        icon: <FaBoxOpen className="sidebar__menu-icon" />, // 📦
        permission: "can_view_products",
        implemented: true,
      },
      {
        label: "Справочники",
        to: "/crm/warehouse/directories",
        icon: <FaTags className="sidebar__menu-icon" />, // 🏷️ бренды/категории
        permission: "can_view_brand_category",
        implemented: true,
      },
      {
        label: "Остатки",
        to: "/crm/warehouse/stocks",
        icon: <FaWarehouse className="sidebar__menu-icon" />, // 🏭
        permission: "can_view_products",
        implemented: true,
      },
      {
        label: "Операции (Перемещения)",
        to: "/crm/warehouse/movements",
        icon: <FaExchangeAlt className="sidebar__menu-icon" />, // 🔄
        permission: "can_view_products",
        implemented: true,
      },
      {
        label: "Поставки",
        to: "/crm/warehouse/supply",
        icon: <FaTruckLoading className="sidebar__menu-icon" />, // 🚚
        permission: "can_view_products",
        implemented: true,
      },
      {
        label: "Списание",
        to: "/crm/warehouse/write_offs",
        icon: <FaTrashAlt className="sidebar__menu-icon" />, // 🗑️
        permission: "can_view_products",
        implemented: true,
      },
    ],
    production: [
      {
        label: "Склад",
        to: "/crm/production/warehouse",
        icon: <Warehouse className="sidebar__menu-icon" />, // 👥
        permission: "can_view_products",
        implemented: true,
      },
      {
        label: "Агенты",
        to: "/crm/production/agents",
        icon: <BsFileEarmarkPerson className="sidebar__menu-icon" />,
        permission: "can_view_agent",
        implemented: true,
      },
    ],

    // ...внутри MENU_CONFIG.sector
  },

  // Дополнительные услуги
  additional: [
    {
      label: "WhatsApp",
      to: "/crm/",
      icon: <FaComments className="sidebar__menu-icon" />,
      permission: "can_view_whatsapp",
      implemented: true,
    },
    {
      label: "Instagram",
      to: "/crm/instagram",
      icon: <InstagramIcon className="sidebar__menu-icon" />,
      permission: "can_view_instagram",
      implemented: true,
    },
    {
      label: "Telegram",
      to: "/crm/",
      icon: <FaComments className="sidebar__menu-icon" />,
      permission: "can_view_telegram",
      implemented: true,
    },
    {
      label: "Документы",
      to: "/crm/documents",
      icon: <MdDocumentScanner className="sidebar__menu-icon" />,
      permission: "can_view_documents",
      implemented: true,
    },
  ],
};

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const [tariff, setTariff] = useState(null);
  const [sector, setSector] = useState(null);
  const { user, company } = useUser();

  const [userAccesses, setUserAccesses] = useState({});
  const [loadingAccesses, setLoadingAccesses] = useState(true);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const res = await fetch(`${BASE_URL}/users/company/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setSector(data.sector?.name);
        const tariffName = data.subscription_plan?.name || "Старт";
        setTariff(tariffName);
      } catch (err) {
        setTariff("Старт");
      }
    };
    fetchCompany();
  }, []);

  const fetchUserAccesses = useCallback(async () => {
    setLoadingAccesses(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setUserAccesses({});
        return;
      }
      const response = await fetch(`${BASE_URL}/users/profile/`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setUserAccesses(data);
    } catch (err) {
      setUserAccesses({});
    } finally {
      setLoadingAccesses(false);
    }
  }, []);

  useEffect(() => {
    fetchUserAccesses();
  }, [fetchUserAccesses]);

  const [openDropdown, setOpenDropdown] = useState(false);

  // Функция для проверки доступа к пункту меню
  const hasPermission = useCallback(
    (permission) => {
      if (!userAccesses || Object.keys(userAccesses).length === 0) {
        return false;
      }
      const hasAccess = userAccesses[permission] === true;
      return hasAccess;
    },
    [userAccesses]
  );

  // Функция для получения секторных пунктов меню
  const getSectorMenuItems = useCallback(() => {
    if (!sector || !company?.sector?.name) return [];

    // Для тарифа "Старт" не показываем секторные пункты меню
    if (tariff === "Старт") {
      return [];
    }

    const sectorName = company.sector.name.toLowerCase();
    const sectorKey = sectorName.replace(/\s+/g, "_");

    // Маппинг названий секторов на ключи конфигурации
    const sectorMapping = {
      строительная_компания: "building",
      ремонтные_и_отделочные_работы: "building",
      архитектура_и_дизайн: "building",
      барбершоп: "barber",
      гостиница: "hostel",
      школа: "school",
      магазин: "market",
      кафе: "cafe",
      "Цветочный магазин": "market",
      производство: "production",
      консалтинг: "consulting",
      склад: "warehouse",
    };

    const configKey = sectorMapping[sectorKey] || sectorKey;
    const sectorConfig = MENU_CONFIG.sector[configKey] || [];

    const filteredItems = sectorConfig.filter((item) =>
      hasPermission(item.permission)
    );

    return filteredItems;
  }, [sector, company, hasPermission, tariff]);

  // Функция для получения дополнительных услуг
  const getAdditionalServices = useCallback(() => {
    // Проверяем доступ пользователю и запреты/разрешения на уровне компании
    const companyAllows = (perm) => {
      if (!company) return undefined;
      if (Object.prototype.hasOwnProperty.call(company, perm)) {
        return company[perm] === true; // true/false как явная политика компании
      }
      return undefined; // нет явной политики на уровне компании
    };

    const isAllowed = (perm) => {
      const userOk = hasPermission(perm);
      const companyOk = companyAllows(perm);
      if (companyOk === false) return false; // компания явно запретила
      return userOk || companyOk === true; // разрешено либо пользователю, либо компанией
    };

    // Доступ к группе
    const groupAllowed = isAllowed("can_view_additional_services");

    // Фильтруем дочерние пункты по совокупному правилу
    let children = MENU_CONFIG.additional.filter((item) =>
      isAllowed(item.permission)
    );

    // Если нет ни одного индивидуально доступного, но есть групповое право — показываем все, кроме тех, что компания явно запретила
    if (children.length === 0 && groupAllowed) {
      children = MENU_CONFIG.additional.filter(
        (item) => companyAllows(item.permission) !== false
      );
    }

    // Специальный пункт для сектора "Консалтинг": добавить "Склад" в Доп. услуги
    const sectorName = company?.sector?.name?.toLowerCase?.() || "";
    if (sectorName === "консалтинг" && isAllowed("can_view_products")) {
      const stockItem = {
        label: "Склад",
        to: "/crm/sklad",
        icon: <Warehouse className="sidebar__menu-icon" />,
        permission: "can_view_products",
        implemented: true,
      };
      const exists = children.some(
        (c) => c.to === stockItem.to || c.label === stockItem.label
      );
      if (!exists) children.push(stockItem);
    }

    // Если нет прав ни на группу, ни на дочерние — ничего не показывать
    if (!groupAllowed && children.length === 0) return null;

    return {
      label: "Доп услуги",
      to: "/crm/additional-services",
      icon: <FaRegClipboard className="sidebar__menu-icon" />,
      implemented: true,
      children,
    };
  }, [hasPermission, company]);

  // Применение гибких правил скрытия (HIDE_RULES)
  const hiddenByRules = useMemo(() => {
    const result = { labels: new Set(), toIncludes: [] };

    HIDE_RULES.forEach((rule) => {
      const { when = {}, hide = {} } = rule;
      const sectorOk = !when.sector || when.sector === sector;
      const tariffOk = !when.tariff || when.tariff === tariff;
      const tariffInOk =
        !when.tariffIn || (tariff && when.tariffIn.includes(tariff));
      const tariffNotInOk =
        !when.tariffNotIn || (tariff && !when.tariffNotIn.includes(tariff));

      if (sectorOk && tariffOk && tariffInOk && tariffNotInOk) {
        (hide.labels || []).forEach((l) => result.labels.add(l));
        (hide.toIncludes || []).forEach((p) => result.toIncludes.push(p));
      }
    });

    return result;
  }, [sector, tariff]);

  // Сборка финального списка меню
  const menuItems = useMemo(() => {
    if (loadingAccesses) return [];

    let items = [];

    // Основные пункты меню
    const basicItems = MENU_CONFIG.basic.filter((item) =>
      hasPermission(item.permission)
    );

    // Секторные пункты меню
    const sectorItems = getSectorMenuItems();

    // Дополнительные услуги
    const additionalServices = getAdditionalServices();

    // Собираем все пункты
    items = [...basicItems];

    // Вставляем секторные пункты после "Обзор"
    const overviewIndex = items.findIndex((item) => item.label === "Обзор");
    if (overviewIndex !== -1 && sectorItems.length > 0) {
      items.splice(overviewIndex + 1, 0, ...sectorItems);
    }

    // Добавляем дополнительные услуги перед "Настройки"
    if (additionalServices) {
      const settingsIndex = items.findIndex(
        (item) => item.label === "Настройки"
      );
      if (settingsIndex !== -1) {
        items.splice(settingsIndex, 0, additionalServices);
      } else {
        items.push(additionalServices);
      }
    }

    // Применяем правила скрытия
    const filteredItems = items.filter((item) => {
      if (!item.implemented) {
        return false;
      }

      // Гибкие правила скрытия
      if (hiddenByRules.labels.has(item.label)) {
        return false;
      }
      if (
        hiddenByRules.toIncludes.length > 0 &&
        typeof item.to === "string" &&
        hiddenByRules.toIncludes.some((p) => item.to.includes(p))
      ) {
        return false;
      }

      return true;
    });

    return filteredItems;
  }, [
    loadingAccesses,
    hasPermission,
    getSectorMenuItems,
    getAdditionalServices,
    hiddenByRules,
  ]);

  const dropdownRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`sidebar ${isOpen ? "sidebar--visible" : ""}`}>
      <div className="sidebar__wrapper">
        <img src={arnament1} className="sidebar__arnament1" alt="Декор" />
        <img src={arnament2} className="sidebar__arnament2" alt="Декор" />
        <div className="sidebar__logo">
          <img src={Logo} alt="Логотип" />
        </div>
        {(!tariff || loadingAccesses) && <p>Загрузка данных...</p>}
        <ul className="sidebar__menu">
          {tariff &&
            !loadingAccesses &&
            menuItems.map(({ label, to, icon, children }) => (
              <li
                key={label}
                className={`sidebar__menu-item-wrapper ${
                  children ? "has-children" : ""
                }`}
              >
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `sidebar__menu-item ${
                      isActive ? "sidebar__menu-item--active" : ""
                    }`
                  }
                  onClick={(e) => {
                    if (children) {
                      if (!openDropdown) {
                        e.preventDefault();
                        setOpenDropdown(true);
                      } else {
                        toggleSidebar();
                      }
                    } else {
                      toggleSidebar();
                    }
                  }}
                >
                  {icon}
                  <span>{label}</span>
                </NavLink>
                {children && (
                  <ul
                    className={`sidebar__submenu ${openDropdown ? "open" : ""}`}
                  >
                    {children.map(({ label, to, icon }) => (
                      <li key={label}>
                        <NavLink
                          to={to}
                          className={({ isActive }) =>
                            `sidebar__submenu-item ${
                              isActive ? "sidebar__submenu-item--active" : ""
                            }`
                          }
                          onClick={toggleSidebar}
                        >
                          {icon}
                          <span>{label}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          <Lang />
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
