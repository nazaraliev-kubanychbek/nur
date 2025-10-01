// src/pages/.../SellModal.jsx
import { ListOrdered, Minus, Plus, Tags, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useLocation } from "react-router-dom";

// import "./Sklad.scss";
import { useDebounce } from "../../../hooks/useDebounce";
import {
  createClientAsync,
  fetchClientsAsync,
} from "../../../store/creators/clientCreators";
import {
  createDeal,
  deleteProductInCart,
  doSearch,
  getProductCheckout,
  getProductInvoice,
  historySellProduct,
  manualFilling,
  productCheckout,
  startSale,
  updateProductInCart,
} from "../../../store/creators/saleThunk";
import {
  addCashFlows,
  getCashBoxes,
  useCash,
} from "../../../store/slices/cashSlice";
import { useClient } from "../../../store/slices/ClientSlice";
import { useSale } from "../../../store/slices/saleSlice";
import { getProfile, useUser } from "../../../store/slices/userSlice";
import BarcodeScanner from "./BarcodeScanner";
import { createDebt } from "./Sell";
import { useTransfer } from "../../../store/slices/transferSlice";
import { fetchTransfersAsync } from "../../../store/creators/transferCreators";
import { useProducts } from "../../../store/slices/productSlice";
import { fetchAgentProductsAsync } from "../../../store/creators/productCreators";

/* =========================
   0) Простая фильтрация (товары, у которых есть остаток у агента)
   ========================= */
export function filterProducts(products = [], transfers = []) {
  const onAgent = new Map();
  for (const t of transfers || []) {
    const pid = String(t.product);
    const qty = Number(t.qty_on_agent) || 0;
    onAgent.set(pid, (onAgent.get(pid) || 0) + qty);
  }

  // Если transfers пустой, показываем все товары с их собственным количеством
  if (transfers.length === 0) {
    return (products || []).map((p) => ({
      ...p,
      on_agent: p.qty_on_hand || p.qty_on_agent || 0,
    }));
  }

  return (products || [])
    .filter((p) => (onAgent.get(String(p.id)) || 0) > 0)
    .map((p) => ({ ...p, on_agent: onAgent.get(String(p.id)) || 0 }));
}

/* =========================
   1) SellModal
   ========================= */
const SellModal = ({ onClose, id, selectCashBox }) => {
  // const { list: transfers } = useTransfer();
  const dispatch = useDispatch();
  const location = useLocation();

  // store hooks
  const { list: cashBoxes } = useCash();
  const { list: clients } = useClient();
  const { company, profile } = useUser();
  const { cart, loading, barcode, error, start, foundProduct } = useSale();

  // только клиенты типа "client"
  const filterClient = useMemo(
    () =>
      (Array.isArray(clients) ? clients : []).filter(
        (c) => c.type === "client"
      ),
    [clients]
  );

  // local state
  const [activeTab, setActiveTab] = useState(
    company?.sector?.name !== "Магазин" ? 1 : 0
  );
  const [isTabSelected, setIsTabSelected] = useState(true);
  const [clientId, setClientId] = useState("");
  const [debt, setDebt] = useState("");
  const [phone, setPhone] = useState("");
  const [inline, setInline] = useState({ id: null, field: null });
  const [quantity, setQuantity] = useState("");
  const [discount, setDiscount] = useState("");
  const { agentProducts: transfers } = useProducts();

  const [showCreateClient, setShowCreateClient] = useState(false);
  const [newClient, setNewClient] = useState({
    full_name: "",
    phone: "",
    email: "",
    date: new Date().toISOString().split("T")[0],
    type: "client",
  });
  const [cashData, setCashData] = useState({
    cashbox: "",
    type: "income",
    name: "",
    amount: "",
  });

  const run = (thunk) => dispatch(thunk).unwrap();

  const pickClient = useMemo(
    () => filterClient.find((x) => String(x.id) === String(clientId)),
    [filterClient, clientId]
  );

  // серверный поиск (если нужен)
  const debouncedSearch = useDebounce((value) => {
    dispatch(doSearch({ search: value }));
  }, 600);

  const onSearch = useCallback(
    (e) => debouncedSearch(e.target.value),
    [debouncedSearch]
  );

  const onNewClientChange = useCallback(
    (e) => setNewClient((p) => ({ ...p, [e.target.name]: e.target.value })),
    []
  );

  const saveInline = useCallback(
    async (productId) => {
      const payload = {
        id,
        productId,
        quantity: quantity ? Number(quantity) : 1,
        discount_total: discount || 0,
      };
      await run(manualFilling(payload));
      await run(startSale());
      setInline({ id: null, field: null });
      setQuantity("");
      setDiscount("");
    },
    [id, quantity, discount, run]
  );

  const addOne = useCallback(
    async (productId) => {
      await run(manualFilling({ id, productId }));
      await run(startSale());
    },
    [id, run]
  );

  const changeQtyOrRemove = useCallback(
    async (item) => {
      const qty = Number(item?.quantity ?? 0);
      if (qty > 1) {
        await run(
          updateProductInCart({
            id,
            productId: item.id,
            data: { quantity: qty - 1 },
          })
        );
      } else {
        await run(deleteProductInCart({ id, productId: item.id }));
      }
      await run(startSale());
    },
    [id, run]
  );

  const createClient = useCallback(
    async (e) => {
      e.preventDefault();
      try {
        const created = await run(createClientAsync(newClient));
        await dispatch(fetchClientsAsync());
        if (created?.id != null) setClientId(String(created.id));
        setPhone(created?.phone || newClient.phone || "");
        setShowCreateClient(false);
      } catch (err) {
        console.error(err);
        alert("Не удалось создать клиента");
      }
    },
    [newClient, run, dispatch]
  );

  // какой список показывать напрямую (для не-Магазина)
  const sellData =
    location.pathname === "/crm/production/agents"
      ? Array.isArray(transfers)
        ? transfers
        : []
      : Array.isArray(foundProduct?.results)
      ? foundProduct.results
      : [];
  

  // данные для "ручного" списка (Магазин): фильтруем товары по остаткам у агента
  const filteredItems = useMemo(() => {
    const base = Array.isArray(foundProduct?.results)
      ? foundProduct.results
      : [];
    const trs = Array.isArray(transfers) ? transfers : [];
    const result = filterProducts(base, trs);
    console.log("filteredItems base:", base);
    console.log("filteredItems transfers:", trs);
    console.log("filteredItems result:", result);
    return result;
  }, [foundProduct?.results, transfers]);

  const performCheckout = useCallback(
    async (withReceipt) => {
      if (debt === "debt") {
        if (!clientId) return alert("Выберите клиента");
        if (!phone) return alert("Введите номер телефона");
        await createDebt({
          name: pickClient?.full_name,
          phone,
          amount: start?.total,
        });
      }

      if (clientId) {
        await run(
          createDeal({
            clientId: clientId,
            title: pickClient?.full_name,
            statusRu: "Продажа",
            amount: start?.total,
          })
        );
      }

      const result = await run(
        productCheckout({
          id: start?.id,
          bool: withReceipt,
          clientId: clientId,
        })
      );

      await run(addCashFlows(cashData));

      if (withReceipt && result?.sale_id) {
        const pdfBlob = await run(getProductCheckout(result.sale_id));
        const pdfInvoiceBlob = await run(getProductInvoice(result.sale_id));
        const dl = (blob, name) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = name;
          a.click();
          URL.revokeObjectURL(url);
        };
        dl(pdfBlob, "receipt.pdf");
        dl(pdfInvoiceBlob, "invoice.pdf");
      }

      dispatch(historySellProduct());
      onClose();
    },
    [
      debt,
      clientId,
      phone,
      pickClient?.full_name,
      start?.total,
      start?.id,
      cashData,
      run,
      dispatch,
      onClose,
    ]
  );

  useEffect(() => {
    dispatch(doSearch({ search: "" }));
  }, [activeTab, dispatch]);

  // Загружаем профиль -> потом трансферы (чтобы не гонять лишний раз)
  useEffect(() => {
    dispatch(getProfile());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchClientsAsync());
    dispatch(getCashBoxes());
    dispatch(fetchAgentProductsAsync());
  }, [dispatch]);

  useEffect(() => {
    if (!profile) return;
    dispatch(
      fetchTransfersAsync(
        profile?.role === "owner" ? {} : { agent: profile?.id }
      )
    );
  }, [dispatch, profile]);

  // аккуратный setCashData без лишних ререндеров
  useEffect(() => {
    setCashData((prev) => {
      const next = {
        ...prev,
        cashbox: selectCashBox,
        name: pickClient ? pickClient.full_name : clientId,
        amount: start?.total,
      };
      if (
        next.cashbox === prev.cashbox &&
        next.name === prev.name &&
        next.amount === prev.amount
      ) {
        return prev;
      }
      return next;
    });
  }, [start?.total, clientId, pickClient?.full_name, selectCashBox]);

  // ✅ учёт разных полей остатков
  const isOutOfStock = useCallback(
    (p) =>
      Number(
        p?.qty_on_hand ?? p?.qty_on_agent ?? p?.quantity ?? p?.stock ?? 0
      ) <= 0,
    []
  );

  const handleTabClick = useCallback((index) => {
    setActiveTab(index);
    setIsTabSelected(true);
  }, []);

  // вкладки (для магазина)
  const tabs = useMemo(
    () => [
      {
        label: "Сканировать",
        content: <BarcodeScanner id={id} />,
        option: "scan",
      },
      {
        label: "Вручную",
        content: (
          <ManualList
            items={filteredItems}
            inline={inline}
            quantity={quantity}
            discount={discount}
            onSearch={onSearch}
            setQuantity={setQuantity}
            setDiscount={setDiscount}
            saveInline={saveInline}
            setInline={setInline}
            addOne={addOne}
            isOutOfStock={isOutOfStock}
          />
        ),
        option: "manually",
      },
    ],
    [
      id,
      filteredItems,
      inline,
      quantity,
      discount,
      onSearch,
      saveInline,
      addOne,
      isOutOfStock,
    ]
  );
  // Примечание: setQuantity/setDiscount/setInline — стабильны по контракту React, их
  // можно не класть в зависимости.

  return (
    <div className="add-modal sell">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content">
        <div className="add-modal__header">
          <h3>Продажа товара</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>

        {company?.sector?.name !== "Магазин" ? (
          <ManualList
            items={sellData}
            inline={inline}
            quantity={quantity}
            discount={discount}
            onSearch={onSearch}
            setQuantity={setQuantity}
            setDiscount={setDiscount}
            saveInline={saveInline}
            setInline={setInline}
            addOne={addOne}
            isOutOfStock={isOutOfStock}
          />
        ) : (
          <>
            {tabs.map((tab, index) => {
              return (
                <button
                  className={`add-modal__button  ${
                    activeTab === index && isTabSelected
                      ? "add-modal__button-active"
                      : ""
                  }`}
                  key={index}
                  onClick={() => handleTabClick(index)}
                >
                  {tab.label}
                </button>
              );
            })}
            {isTabSelected && activeTab !== null && (
              <div className="add-modal__container">
                {tabs[activeTab].content}
              </div>
            )}
          </>
        )}

        {!!start?.items?.length && (
          <div className="receipt">
            <h2 className="receipt__title">Приход</h2>

            <ClientBlock
              company={company}
              filterClient={filterClient}
              clientId={clientId}
              setClientId={setClientId}
              showCreateClient={showCreateClient}
              setShowCreateClient={setShowCreateClient}
              newClient={newClient}
              onNewClientChange={onNewClientChange}
              createClient={createClient}
            />
            {paymentBlockMemo(
              company?.sector?.name,
              debt,
              phone,
              setDebt,
              setPhone
            )}

            {start.items.map((p, idx) => (
              <div className="receipt__item" key={p.id ?? idx}>
                <p className="receipt__item-name">
                  {idx + 1}. {p.product_name}
                </p>
                <div>
                  <p>{p.tax_total}</p>
                  <p className="receipt__item-price">
                    {p.quantity} x {p.unit_price} ≡ {p.quantity * p.unit_price}
                  </p>
                  <button type="button" onClick={() => changeQtyOrRemove(p)}>
                    <Minus size={16} />
                  </button>
                </div>
              </div>
            ))}

            <div className="receipt__total">
              <b>ИТОГО</b>
              <div style={{ gap: 10, display: "flex", alignItems: "center" }}>
                <p>Общая скидка {start?.discount_total}</p>
                <p>Налог {start?.tax_total}</p>
                <b>≡ {start?.total}</b>
              </div>
            </div>

            <div className="receipt__row">
              <button
                className="receipt__row-btn"
                onClick={() => performCheckout(true)}
                type="button"
              >
                Печать чека
              </button>
              <button
                className="receipt__row-btn"
                onClick={() => performCheckout(false)}
                type="button"
              >
                Без чека
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellModal;

/* =========================
   2) PaymentBlock — выносим в чистую функцию + useMemo-хелпер
   ========================= */
function PaymentBlock({ sectorName, debt, setDebt, phone, setPhone }) {
  if (sectorName !== "Магазин") return null;
  return (
    <>
      <div className="add-modal__section">
        <label>Тип оплаты</label>
        <select
          className="add-modal__input"
          value={debt}
          onChange={(e) => setDebt(e.target.value)}
        >
          <option value="">-- Выберите тип оплаты --</option>
          <option value="debt">Долг</option>
        </select>
      </div>

      {debt === "debt" && (
        <div className="add-modal__section">
          <label>Телефон *</label>
          <input
            className="add-modal__input"
            placeholder="Введите номер телефона"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
      )}
    </>
  );
}

// мемо-хелпер, чтобы не держать громкий useMemo внутри SellModal
const paymentBlockMemo = (sectorName, debt, phone, setDebt, setPhone) => (
  <PaymentBlock
    sectorName={sectorName}
    debt={debt}
    setDebt={setDebt}
    phone={phone}
    setPhone={setPhone}
  />
);

/* =========================
   3) ManualList (устойчивый к undefined)
   ========================= */
const ManualList = React.memo(function ManualList({
  items = [],
  inline,
  quantity,
  discount,
  onSearch,
  setQuantity,
  setDiscount,
  saveInline,
  setInline,
  addOne,
  isOutOfStock,
}) {
  const location = useLocation();

  // Унификация списка
  const list = Array.isArray(items)
    ? items
    : Array.isArray(items?.results)
    ? items.results
    : [];

  // Единый способ получать id/name/qty
  const getItemId = (p) => p?.id ?? p?.product;
  const getItemName = (p) => p?.name ?? p?.product_name ?? "";
  const getItemQty = (p) =>
    p?.qty_on_agent ?? p?.qty_on_hand ?? p?.quantity ?? p?.stock ?? 0;

  return (
    <div className="sell__manual">
      <input
        type="text"
        placeholder="Введите название товара"
        className="add-modal__input"
        name="search"
        onChange={onSearch}
      />
      <ul className="sell__list">
        {list.map((p) => {
          const pid = getItemId(p);
          return (
            <li key={pid}>
              <div style={{ display: "flex", columnGap: "10px" }}>
                <p>{getItemName(p)}</p>
                <p>{getItemQty(p)}</p>
              </div>
              <div className="sell__list-row">
                {isOutOfStock(p) ? (
                  <div className="sell__empty">
                    <span className="sell__badge--danger">Нет в наличии</span>
                  </div>
                ) : inline.id === pid && inline.field === "quantity" ? (
                  <>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Количество"
                    />
                    <button type="button" onClick={() => saveInline(pid)}>
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setInline({ id: null, field: null })}
                    >
                      Отмена
                    </button>
                  </>
                ) : inline.id === pid && inline.field === "discount" ? (
                  <>
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="Скидка (%)"
                    />
                    <button type="button" onClick={() => saveInline(pid)}>
                      Сохранить
                    </button>
                    <button
                      type="button"
                      onClick={() => setInline({ id: null, field: null })}
                    >
                      Отмена
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setInline({ id: pid, field: "discount" })}
                    >
                      <Tags />
                    </button>
                    <button
                      type="button"
                      onClick={() => setInline({ id: pid, field: "quantity" })}
                    >
                      <ListOrdered />
                    </button>
                    <button type="button" onClick={() => addOne(pid)}>
                      <Plus size={16} />
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

/* =========================
   4) ClientBlock — вынесен и мемоизирован
   ========================= */
const ClientBlock = React.memo(function ClientBlock({
  company,
  filterClient,
  clientId,
  setClientId,
  showCreateClient,
  setShowCreateClient,
  newClient,
  onNewClientChange,
  createClient,
}) {
  return (
    <div className="add-modal__section">
      <label>Клиенты *</label>
      <select
        className="add-modal__input"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        required
      >
        <option value="">-- Выберите клиента --</option>
        {filterClient.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.full_name}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="create-client"
        onClick={() => setShowCreateClient((s) => !s)}
      >
        {showCreateClient ? "Отменить" : "Создать клиента"}
      </button>

      {showCreateClient && (
        <form
          style={{ display: "flex", flexDirection: "column", rowGap: 10 }}
          onSubmit={createClient}
        >
          <input
            className="add-modal__input"
            onChange={onNewClientChange}
            name="full_name"
            placeholder="ФИО"
            value={newClient.full_name}
          />
          <input
            className="add-modal__input"
            onChange={onNewClientChange}
            name="phone"
            placeholder="Телефон"
            value={newClient.phone}
          />
          <input
            className="add-modal__input"
            onChange={onNewClientChange}
            name="email"
            placeholder="Почта"
            value={newClient.email}
          />
          <button type="submit" className="create-client">
            Создать
          </button>
        </form>
      )}

      {company?.sector?.name === "Строительная компания" && (
        <select className="add-modal__input" defaultValue="">
          <option value="" disabled>
            -- Выберите тип платежа --
          </option>
          <option>Аванс</option>
          <option>Кредит</option>
          <option>Полная оплата</option>
        </select>
      )}
    </div>
  );
});

// // src/pages/.../SellModal.jsx
// import { ListOrdered, Minus, Plus, Tags, X } from "lucide-react";
// import React, { useEffect, useMemo, useState } from "react";
// import { useDispatch } from "react-redux";
// import { useLocation } from "react-router-dom";

// // import "./Sklad.scss";
// import { useDebounce } from "../../../hooks/useDebounce";
// import {
//   createClientAsync,
//   fetchClientsAsync,
// } from "../../../store/creators/clientCreators";
// import {
//   createDeal,
//   deleteProductInCart,
//   doSearch,
//   getProductCheckout,
//   getProductInvoice,
//   historySellProduct,
//   manualFilling,
//   productCheckout,
//   startSale,
//   updateProductInCart,
// } from "../../../store/creators/saleThunk";
// import {
//   addCashFlows,
//   getCashBoxes,
//   useCash,
// } from "../../../store/slices/cashSlice";
// import { useClient } from "../../../store/slices/ClientSlice";
// import { useSale } from "../../../store/slices/saleSlice";
// import { getProfile, useUser } from "../../../store/slices/userSlice";
// import BarcodeScanner from "./BarcodeScanner";
// import { createDebt } from "./Sell";
// import { useTransfer } from "../../../store/slices/transferSlice";
// import { fetchTransfersAsync } from "../../../store/creators/transferCreators";

// /* =========================
//    0) Простая фильтрация (товары, у которых есть остаток у агента)
//    ========================= */
// export function filterProducts(products = [], transfers = []) {
//   const onAgent = new Map();
//   for (const t of transfers || []) {
//     const pid = String(t.product);
//     const qty = Number(t.qty_on_agent) || 0;
//     onAgent.set(pid, (onAgent.get(pid) || 0) + qty);
//   }
//   return (products || [])
//     .filter((p) => (onAgent.get(String(p.id)) || 0) > 0)
//     .map((p) => ({ ...p, on_agent: onAgent.get(String(p.id)) || 0 }));
// }

// /* =========================
//    1) SellModal
//    ========================= */
// const SellModal = ({ onClose, id, selectCashBox }) => {
//   const { list: transfers } = useTransfer();
//   const dispatch = useDispatch();
//   const location = useLocation();

//   // store hooks
//   const { list: cashBoxes } = useCash();
//   const { list: clients } = useClient();
//   const { company, profile } = useUser();
//   const { cart, loading, barcode, error, start, foundProduct } = useSale();

//   // только клиенты типа "client"
//   const filterClient = useMemo(
//     () =>
//       (Array.isArray(clients) ? clients : []).filter(
//         (c) => c.type === "client"
//       ),
//     [clients]
//   );

//   // local state
//   const [activeTab, setActiveTab] = useState(
//     company?.sector?.name !== "Магазин" ? 1 : 0
//   );
//   const [isTabSelected, setIsTabSelected] = useState(true);
//   const [clientId, setClientId] = useState("");
//   const [debt, setDebt] = useState("");
//   const [phone, setPhone] = useState("");
//   const [inline, setInline] = useState({ id: null, field: null });
//   const [quantity, setQuantity] = useState("");
//   const [discount, setDiscount] = useState("");

//   const [showCreateClient, setShowCreateClient] = useState(false);
//   const [newClient, setNewClient] = useState({
//     full_name: "",
//     phone: "",
//     email: "",
//     date: new Date().toISOString().split("T")[0],
//     type: "client",
//   });
//   const [cashData, setCashData] = useState({
//     cashbox: "",
//     type: "income",
//     name: "",
//     amount: "",
//   });

//   const run = (thunk) => dispatch(thunk).unwrap();

//   const pickClient = useMemo(
//     () => filterClient.find((x) => String(x.id) === String(clientId)),
//     [filterClient, clientId]
//   );

//   // серверный поиск (если нужен)
//   const debouncedSearch = useDebounce((value) => {
//     dispatch(doSearch({ search: value }));
//   }, 600);
//   const onSearch = (e) => debouncedSearch(e.target.value);
//   const onNewClientChange = (e) =>
//     setNewClient((p) => ({ ...p, [e.target.name]: e.target.value }));

//   const saveInline = async (productId) => {
//     const payload = {
//       id,
//       productId,
//       quantity: quantity ? Number(quantity) : 1,
//       discount_total: discount || 0,
//     };
//     await run(manualFilling(payload));
//     await run(startSale());
//     setInline({ id: null, field: null });
//     setQuantity("");
//     setDiscount("");
//   };

//   const addOne = async (productId) => {
//     await run(manualFilling({ id, productId }));
//     await run(startSale());
//   };

//   const changeQtyOrRemove = async (item) => {
//     const qty = Number(item?.quantity ?? 0);
//     if (qty > 1) {
//       await run(
//         updateProductInCart({
//           id,
//           productId: item.id,
//           data: { quantity: qty - 1 },
//         })
//       );
//     } else {
//       await run(deleteProductInCart({ id, productId: item.id }));
//     }
//     await run(startSale());
//   };

//   const createClient = async (e) => {
//     e.preventDefault();
//     try {
//       const created = await run(createClientAsync(newClient));
//       await dispatch(fetchClientsAsync());
//       if (created?.id != null) setClientId(String(created.id));
//       setPhone(created?.phone || newClient.phone || "");
//       setShowCreateClient(false);
//     } catch (err) {
//       console.error(err);
//       alert("Не удалось создать клиента");
//     }
//   };

//   // какой список показывать напрямую (для не-Магазина)
//   const sellData =
//     location.pathname === "/crm/production/agents"
//       ? Array.isArray(transfers)
//         ? transfers
//         : []
//       : Array.isArray(foundProduct?.results)
//       ? foundProduct.results
//       : [];

//   // данные для "ручного" списка (Магазин): фильтруем товары по остаткам у агента
//   const filteredItems = useMemo(() => {
//     const base = Array.isArray(foundProduct?.results)
//       ? foundProduct.results
//       : [];
//     const trs = Array.isArray(transfers) ? transfers : [];
//     return filterProducts(base, trs);
//   }, [foundProduct?.results, transfers]);

//   const performCheckout = async (withReceipt) => {
//     if (debt === "debt") {
//       if (!clientId) return alert("Выберите клиента");
//       if (!phone) return alert("Введите номер телефона");
//       await createDebt({
//         name: pickClient?.full_name,
//         phone,
//         amount: start?.total,
//       });
//     }

//     if (clientId) {
//       await run(
//         createDeal({
//           clientId: clientId,
//           title: pickClient?.full_name,
//           statusRu: "Продажа",
//           amount: start?.total,
//         })
//       );
//     }

//     const result = await run(
//       productCheckout({
//         id: start?.id,
//         bool: withReceipt,
//         clientId: clientId,
//       })
//     );

//     await run(addCashFlows(cashData));

//     if (withReceipt && result?.sale_id) {
//       const pdfBlob = await run(getProductCheckout(result.sale_id));
//       const pdfInvoiceBlob = await run(getProductInvoice(result.sale_id));
//       const dl = (blob, name) => {
//         const url = URL.createObjectURL(blob);
//         const a = document.createElement("a");
//         a.href = url;
//         a.download = name;
//         a.click();
//         URL.revokeObjectURL(url);
//       };
//       dl(pdfBlob, "receipt.pdf");
//       dl(pdfInvoiceBlob, "invoice.pdf");
//     }

//     dispatch(historySellProduct());
//     onClose();
//   };

//   useEffect(() => {
//     dispatch(doSearch({ search: "" }));
//   }, [activeTab, dispatch]);

//   useEffect(() => {
//     dispatch(getProfile());
//     dispatch(fetchClientsAsync());
//     dispatch(
//       fetchTransfersAsync(
//         profile?.role === "owner" ? {} : { agent: profile?.id }
//       )
//     );
//     dispatch(getCashBoxes());
//   }, [dispatch]);

//   useEffect(() => {
//     setCashData((p) => ({
//       ...p,
//       cashbox: selectCashBox,
//       name: pickClient ? pickClient.full_name : clientId,
//       amount: start?.total,
//     }));
//   }, [start, clientId, pickClient, selectCashBox]);

//   // ✅ учёт разных полей остатков
//   const isOutOfStock = (p) =>
//     Number(p?.on_agent ?? p?.qty_on_agent ?? p?.quantity ?? p?.stock ?? 0) <= 0;

//   const handleTabClick = (index) => {
//     setActiveTab(index);
//     setIsTabSelected(true);
//   };

//   const ClientBlock = () => (
//     <div className="add-modal__section">
//       <label>Клиенты *</label>
//       <select
//         className="add-modal__input"
//         value={clientId}
//         onChange={(e) => setClientId(e.target.value)}
//         required
//       >
//         <option value="">-- Выберите клиента --</option>
//         {filterClient.map((c) => (
//           <option key={c.id} value={String(c.id)}>
//             {c.full_name}
//           </option>
//         ))}
//       </select>

//       <button
//         type="button"
//         className="create-client"
//         onClick={() => setShowCreateClient((s) => !s)}
//       >
//         {showCreateClient ? "Отменить" : "Создать клиента"}
//       </button>

//       {showCreateClient && (
//         <form
//           style={{ display: "flex", flexDirection: "column", rowGap: 10 }}
//           onSubmit={createClient}
//         >
//           <input
//             className="add-modal__input"
//             onChange={onNewClientChange}
//             name="full_name"
//             placeholder="ФИО"
//             value={newClient.full_name}
//           />
//           <input
//             className="add-modal__input"
//             onChange={onNewClientChange}
//             name="phone"
//             placeholder="Телефон"
//             value={newClient.phone}
//           />
//           <input
//             className="add-modal__input"
//             onChange={onNewClientChange}
//             name="email"
//             placeholder="Почта"
//             value={newClient.email}
//           />
//           <button type="submit" className="create-client">
//             Создать
//           </button>
//         </form>
//       )}

//       {company?.sector?.name === "Строительная компания" && (
//         <select className="add-modal__input" defaultValue="">
//           <option value="" disabled>
//             -- Выберите тип платежа --
//           </option>
//           <option>Аванс</option>
//           <option>Кредит</option>
//           <option>Полная оплата</option>
//         </select>
//       )}
//     </div>
//   );

//   const paymentBlock = useMemo(() => {
//     if (company?.sector?.name !== "Магазин") return null;
//     return (
//       <>
//         <div className="add-modal__section">
//           <label>Тип оплаты</label>
//           <select
//             className="add-modal__input"
//             value={debt}
//             onChange={(e) => setDebt(e.target.value)}
//           >
//             <option value="">-- Выберите тип оплаты --</option>
//             <option value="debt">Долг</option>
//           </select>
//         </div>

//         {debt === "debt" && (
//           <div className="add-modal__section">
//             <label>Телефон *</label>
//             <input
//               className="add-modal__input"
//               placeholder="Введите номер телефона"
//               value={phone}
//               onChange={(e) => setPhone(e.target.value)}
//             />
//           </div>
//         )}
//       </>
//     );
//   }, [company?.sector?.name, debt, phone]);

//   // вкладки (для магазина)
//   const tabs = useMemo(
//     () => [
//       {
//         label: "Сканировать",
//         content: <BarcodeScanner id={id} />,
//         option: "scan",
//       },
//       {
//         label: "Вручную",
//         content: (
//           <ManualList
//             items={filteredItems} // ✅ уже отфильтрованные товары
//             inline={inline}
//             quantity={quantity}
//             discount={discount}
//             onSearch={onSearch}
//             setQuantity={setQuantity}
//             setDiscount={setDiscount}
//             saveInline={saveInline}
//             setInline={setInline}
//             addOne={addOne}
//             isOutOfStock={isOutOfStock}
//           />
//         ),
//         option: "manually",
//       },
//     ],
//     [
//       id,
//       filteredItems,
//       inline,
//       quantity,
//       discount,
//       onSearch,
//       setQuantity,
//       setDiscount,
//       saveInline,
//       setInline,
//       addOne,
//       isOutOfStock,
//     ]
//   );

//   return (
//     <div className="add-modal sell">
//       <div className="add-modal__overlay" onClick={onClose} />
//       <div className="add-modal__content">
//         <div className="add-modal__header">
//           <h3>Продажа товара</h3>
//           <X className="add-modal__close-icon" size={20} onClick={onClose} />
//         </div>

//         {company?.sector?.name !== "Магазин" ? (
//           <ManualList
//             items={sellData}
//             inline={inline}
//             quantity={quantity}
//             discount={discount}
//             onSearch={onSearch}
//             setQuantity={setQuantity}
//             setDiscount={setDiscount}
//             saveInline={saveInline}
//             setInline={setInline}
//             addOne={addOne}
//             isOutOfStock={isOutOfStock}
//           />
//         ) : (
//           <>
//             {tabs.map((tab, index) => {
//               return (
//                 <button
//                   className={`add-modal__button  ${
//                     activeTab === index && isTabSelected
//                       ? "add-modal__button-active"
//                       : ""
//                   }`}
//                   key={index}
//                   onClick={() => handleTabClick(index)}
//                 >
//                   {tab.label}
//                 </button>
//               );
//             })}
//             {isTabSelected && activeTab !== null && (
//               <div className="add-modal__container">
//                 {tabs[activeTab].content}
//               </div>
//             )}
//           </>
//         )}

//         {!!start?.items?.length && (
//           <div className="receipt">
//             <h2 className="receipt__title">Приход</h2>

//             <ClientBlock />
//             {paymentBlock}

//             {start.items.map((p, idx) => (
//               <div className="receipt__item" key={p.id ?? idx}>
//                 <p className="receipt__item-name">
//                   {idx + 1}. {p.product_name}
//                 </p>
//                 <div>
//                   <p>{p.tax_total}</p>
//                   <p className="receipt__item-price">
//                     {p.quantity} x {p.unit_price} ≡ {p.quantity * p.unit_price}
//                   </p>
//                   <button type="button" onClick={() => changeQtyOrRemove(p)}>
//                     <Minus size={16} />
//                   </button>
//                 </div>
//               </div>
//             ))}

//             <div className="receipt__total">
//               <b>ИТОГО</b>
//               <div style={{ gap: 10, display: "flex", alignItems: "center" }}>
//                 <p>Общая скидка {start?.discount_total}</p>
//                 <p>Налог {start?.tax_total}</p>
//                 <b>≡ {start?.total}</b>
//               </div>
//             </div>

//             <div className="receipt__row">
//               <button
//                 className="receipt__row-btn"
//                 onClick={() => performCheckout(true)}
//                 type="button"
//               >
//                 Печать чека
//               </button>
//               <button
//                 className="receipt__row-btn"
//                 onClick={() => performCheckout(false)}
//                 type="button"
//               >
//                 Без чека
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default SellModal;

// /* =========================
//    3) ManualList (устойчивый к undefined)
//    ========================= */
// const ManualList = React.memo(function ManualList({
//   items = [],
//   inline,
//   quantity,
//   discount,
//   onSearch,
//   setQuantity,
//   setDiscount,
//   saveInline,
//   setInline,
//   addOne,
//   isOutOfStock,
// }) {
//   const location = useLocation();

//   // Унификация списка
//   const list = Array.isArray(items)
//     ? items
//     : Array.isArray(items?.results)
//     ? items.results
//     : [];

//   // Единый способ получать id/name/qty
//   const getItemId = (p) => p?.id ?? p?.product;
//   const getItemName = (p) => p?.name ?? p?.product_name ?? "";
//   const getItemQty = (p) =>
//     p?.qty_on_agent ?? p?.on_agent ?? p?.quantity ?? p?.stock ?? 0;

//   return (
//     <div className="sell__manual">
//       <input
//         type="text"
//         placeholder="Введите название товара"
//         className="add-modal__input"
//         name="search"
//         onChange={onSearch}
//       />
//       <ul className="sell__list">
//         {list.map((p) => {
//           const pid = getItemId(p);
//           return (
//             <li key={pid}>
//               <div style={{ display: "flex", columnGap: "10px" }}>
//                 <p>{getItemName(p)}</p>
//                 <p>{getItemQty(p)}</p>
//               </div>
//               <div className="sell__list-row">
//                 {isOutOfStock(p) ? (
//                   <div className="sell__empty">
//                     <span className="sell__badge--danger">Нет в наличии</span>
//                   </div>
//                 ) : inline.id === pid && inline.field === "quantity" ? (
//                   <>
//                     <input
//                       type="number"
//                       value={quantity}
//                       onChange={(e) => setQuantity(e.target.value)}
//                       placeholder="Количество"
//                     />
//                     <button type="button" onClick={() => saveInline(pid)}>
//                       Сохранить
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => setInline({ id: null, field: null })}
//                     >
//                       Отмена
//                     </button>
//                   </>
//                 ) : inline.id === pid && inline.field === "discount" ? (
//                   <>
//                     <input
//                       type="number"
//                       value={discount}
//                       onChange={(e) => setDiscount(e.target.value)}
//                       placeholder="Скидка (%)"
//                     />
//                     <button type="button" onClick={() => saveInline(pid)}>
//                       Сохранить
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => setInline({ id: null, field: null })}
//                     >
//                       Отмена
//                     </button>
//                   </>
//                 ) : (
//                   <>
//                     <button
//                       type="button"
//                       onClick={() => setInline({ id: pid, field: "discount" })}
//                     >
//                       <Tags />
//                     </button>
//                     <button
//                       type="button"
//                       onClick={() => setInline({ id: pid, field: "quantity" })}
//                     >
//                       <ListOrdered />
//                     </button>
//                     <button type="button" onClick={() => addOne(pid)}>
//                       <Plus size={16} />
//                     </button>
//                   </>
//                 )}
//               </div>
//             </li>
//           );
//         })}
//       </ul>
//     </div>
//   );
// });
