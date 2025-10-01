// src/pages/Warehouse/FinishedGoods/FinishedGoods.jsx
import { MoreVertical, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

/* ---- Thunks / Creators ---- */
import {
  consumeItemsMake,
  createProductAsync,
  deleteProductAsync,
  fetchBrandsAsync,
  fetchCategoriesAsync,
  fetchProductsAsync,
  getItemsMake,
  // +++ добавлено для редактирования/удаления:
  updateProductAsync,
} from "../../../../store/creators/productCreators";

/* ---- Transfer / Acceptance ---- */
import {
  acceptInlineAsync,
  createTransferAsync,
  createBulkTransferAsync,
  createReturnAsync,
  updateProductQuantityAsync,
} from "../../../../store/creators/transferCreators";

/* ---- Cash ---- */
import {
  addCashFlows,
  getCashBoxes,
  useCash,
} from "../../../../store/slices/cashSlice";

/* ---- Products slice selector ---- */
import { useProducts } from "../../../../store/slices/productSlice";

/* ---- Clients ---- */
import {
  createClientAsync,
  fetchClientsAsync,
} from "../../../../store/creators/clientCreators";
import { useClient } from "../../../../store/slices/ClientSlice";

/* ---- UI ---- */
import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import { Checkbox, TextField } from "@mui/material";
import { getEmployees } from "../../../../store/creators/departmentCreators";
import { useDepartments } from "../../../../store/slices/departmentSlice";
import MarriageModal from "../../../Deposits/Sklad/MarriageModal";

/* ============================================================
   Модалка добавления товара (Redux, без localStorage)
   ============================================================ */
const AddModal = ({ onClose, onSaveSuccess, selectCashBox }) => {
  const dispatch = useDispatch();

  // Категории/бренды из product slice
  const { categories, brands } = useProducts();

  // Сырьё: product.itemsMake
  const materials = useSelector((s) => s.product?.itemsMake ?? []);
  const materialsLoading =
    useSelector(
      (s) => s.product?.itemsMakeLoading ?? s.product?.loadingItemsMake
    ) ?? false;

  // Поставщики
  const { list: clients } = useClient();
  const suppliers = useMemo(
    () => (clients || []).filter((c) => c.type === "suppliers"),
    [clients]
  );

  // Форма товара
  const [product, setProduct] = useState({
    name: "",
    barcode: "",
    brand_name: "",
    category_name: "",
    price: "",
    quantity: "",
    client: "",
    purchase_price: "",
  });

  // Движение по кассе
  const [cashData, setCashData] = useState({
    cashbox: "",
    type: "expense",
    name: "",
    amount: "",
  });

  // Быстрое создание поставщика
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [supplier, setSupplier] = useState({
    full_name: "",
    phone: "",
    email: "",
    date: new Date().toISOString().split("T")[0],
    type: "suppliers",
    llc: "",
    inn: "",
    okpo: "",
    score: "",
    bik: "",
    address: "",
  });

  // Рецепт: [{ materialId, quantity? }] — quantity только для UI
  const [recipeItems, setRecipeItems] = useState([]);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [materialQuery, setMaterialQuery] = useState("");

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Карта выбранных материалов
  const recipeMap = useMemo(() => {
    const m = new Map();
    recipeItems.forEach((it) =>
      m.set(String(it.materialId), String(it.quantity ?? ""))
    );
    return m;
  }, [recipeItems]);

  // Фильтрация сырья
  const filteredMaterials = useMemo(() => {
    const list = Array.isArray(materials) ? materials : [];
    const q = materialQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((m) =>
      (m.name || m.title || "").toLowerCase().includes(q)
    );
  }, [materials, materialQuery]);

  // Подгрузка в модалке
  useEffect(() => {
    dispatch(getItemsMake());
    dispatch(fetchClientsAsync());
    dispatch(fetchCategoriesAsync());
    dispatch(fetchBrandsAsync());
  }, [dispatch]);

  // Хэндлеры
  const onProductChange = (e) => {
    const { name, value, type } = e.target;
    setProduct((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const onSupplierChange = (e) => {
    const { name, value } = e.target;
    setSupplier((prev) => ({ ...prev, [name]: value }));
  };

  const createSupplier = async (e) => {
    e.preventDefault();
    if (!supplier.full_name?.trim()) {
      alert("Укажите ФИО поставщика");
      return;
    }
    try {
      await dispatch(createClientAsync(supplier)).unwrap();
      setShowSupplierForm(false);
    } catch (err) {
      alert(`Не удалось создать поставщика: ${err?.message || "ошибка"}`);
    }
  };

  // Рецепт — выбор/изменение/удаление
  const toggleRecipeItem = (materialId) => {
    const key = String(materialId);
    const exists = recipeMap.has(key);
    if (exists) {
      setRecipeItems((prev) =>
        prev.filter((it) => String(it.materialId) !== key)
      );
    } else {
      setRecipeItems((prev) => [...prev, { materialId, quantity: "1" }]);
    }
  };

  const changeRecipeQty = (materialId, qty) => {
    const key = String(materialId);
    setRecipeItems((prev) =>
      prev.map((it) =>
        String(it.materialId) === key ? { ...it, quantity: qty } : it
      )
    );
  };

  const removeRecipeItem = (materialId) => {
    const key = String(materialId);
    setRecipeItems((prev) =>
      prev.filter((it) => String(it.materialId) !== key)
    );
  };

  // валидатор товара
  const validateProduct = () => {
    const required = [
      ["name", "Название"],
      ["barcode", "Штрихкод"],
      ["brand_name", "Бренд"],
      ["category_name", "Категория"],
      ["price", "Розничная цена"],
      ["purchase_price", "Закупочная цена"],
      ["quantity", "Количество"],
      ["client", "Поставщик"],
    ];
    const missed = required.filter(
      ([k]) => product[k] === "" || product[k] === null
    );
    if (missed.length) {
      alert("Пожалуйста, заполните все обязательные поля.");
      return false;
    }
    return true;
  };

  // submit
  const handleSubmit = async () => {
    setCreateError(null);
    if (!validateProduct()) return;

    // рецепт для списания: [{id, qty_per_unit}]
    const recipe = recipeItems
      .map((it) => ({
        id: String(it.materialId),
        qty_per_unit: Number(it.quantity || 0),
      }))
      .filter((r) => r.qty_per_unit > 0);

    // сколько ед. готового товара делаем
    const units = Number(product.quantity || 0);

    // item_make — только ID
    const item_make = recipeItems.map((it) => it.materialId);

    setCreating(true);
    try {
      // 1) списание сырья
      if (recipe.length && units > 0) {
        await dispatch(consumeItemsMake({ recipe, units })).unwrap();
      }

      // 2) создание товара
      const payload = {
        name: product.name,
        barcode: product.barcode,
        brand_name: product.brand_name,
        category_name: product.category_name,
        price: Number(product.price),
        quantity: Number(product.quantity),
        client: product.client, // id поставщика
        purchase_price: Number(product.purchase_price),
        item_make,
      };

      await dispatch(createProductAsync(payload)).unwrap();

      setCreating(false);
      onClose?.();
      onSaveSuccess?.();
    } catch (err) {
      setCreating(false);
      setCreateError(err);
      alert(
        `Ошибка при добавлении товара: ${err?.message || "неизвестная ошибка"}`
      );
    }
  };

  // актуализируем данные по кассе при изменениях
  useEffect(() => {
    setCashData((prev) => ({
      ...prev,
      cashbox: selectCashBox,
      name: product.name,
      amount: product.price,
    }));
  }, [product, selectCashBox]);

  /* ------------------------ Верстка ------------------------ */
  return (
    <div className="add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content">
        <div className="add-modal__header">
          <h3>Добавление товара</h3>
          <button className="add-modal__close-icon" onClick={onClose}>
            ✕
          </button>
        </div>

        {createError && (
          <p className="add-modal__error-message">
            Ошибка добавления: {createError.message || "ошибка"}
          </p>
        )}

        {/* Основные поля */}
        <div className="add-modal__section">
          <label>Название *</label>
          <input
            name="name"
            className="add-modal__input"
            placeholder="Например, Буханка хлеба"
            value={product.name}
            onChange={onProductChange}
            required
          />
        </div>

        <div className="add-modal__section">
          <label>Штрих код *</label>
          <input
            name="barcode"
            className="add-modal__input"
            placeholder="Штрих код"
            value={product.barcode}
            onChange={onProductChange}
            required
          />
        </div>

        <div className="add-modal__section">
          <label>Бренд *</label>
          <select
            name="brand_name"
            className="add-modal__input"
            value={product.brand_name}
            onChange={onProductChange}
            required
          >
            <option value="">-- Выберите бренд --</option>
            {brands.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="add-modal__section">
          <label>Категория *</label>
          <select
            name="category_name"
            className="add-modal__input"
            value={product.category_name}
            onChange={onProductChange}
            required
          >
            <option value="">-- Выберите категорию --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Поставщик + быстрое создание */}
        <div className="add-modal__section">
          <label>Поставщик *</label>
          <select
            name="client"
            className="add-modal__input"
            value={product.client}
            onChange={onProductChange}
            required
          >
            <option value="">-- Выберите поставщика --</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>

          <button
            className="create-client"
            onClick={() => setShowSupplierForm((v) => !v)}
          >
            {showSupplierForm ? "Отменить" : "Создать поставщика"}
          </button>

          {showSupplierForm && (
            <form
              style={{
                display: "flex",
                flexDirection: "column",
                rowGap: "10px",
              }}
              onSubmit={createSupplier}
            >
              <input
                className="add-modal__input"
                onChange={onSupplierChange}
                type="text"
                placeholder="ФИО"
                name="full_name"
              />
              <input
                className="add-modal__input"
                onChange={onSupplierChange}
                type="text"
                name="llc"
                placeholder="ОсОО"
              />
              <input
                className="add-modal__input"
                onChange={onSupplierChange}
                type="text"
                name="inn"
                placeholder="ИНН"
              />
              <input
                className="add-modal__input"
                onChange={onSupplierChange}
                type="text"
                name="okpo"
                placeholder="ОКПО"
              />
              <input
                className="add-modal__input"
                onChange={onSupplierChange}
                type="text"
                name="score"
                placeholder="Р/СЧЁТ"
              />
              <input
                className="add-modal__input"
                onChange={onSupplierChange}
                type="text"
                name="bik"
                placeholder="БИК"
              />
              <input
                className="add-modal__input"
                onChange={onSupplierChange}
                type="text"
                name="address"
                placeholder="Адрес"
              />
              <input
                className="add-modal__input"
                onChange={onSupplierChange}
                type="text"
                name="phone"
                placeholder="Телефон"
              />
              <input
                className="add-modal__input"
                onChange={onSupplierChange}
                type="email"
                name="email"
                placeholder="Почта"
              />
              <div style={{ display: "flex", columnGap: "10px" }}>
                <button
                  className="create-client"
                  type="button"
                  onClick={() => setShowSupplierForm(false)}
                >
                  Отмена
                </button>
                <button className="create-client">Создать</button>
              </div>
            </form>
          )}
        </div>

        {/* Цена и количество */}
        <div className="add-modal__section">
          <label>Розничная цена *</label>
          <input
            type="number"
            name="price"
            className="add-modal__input"
            placeholder="120"
            value={product.price}
            onChange={onProductChange}
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="add-modal__section">
          <label>Закупочная цена *</label>
          <input
            type="number"
            name="purchase_price"
            className="add-modal__input"
            placeholder="80"
            value={product.purchase_price}
            onChange={onProductChange}
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="add-modal__section">
          <label>Количество *</label>
          <input
            type="number"
            name="quantity"
            className="add-modal__input"
            placeholder="100"
            value={product.quantity}
            onChange={onProductChange}
            min="0"
            required
          />
        </div>

        {/* Состав (сырьё) */}
        <div className="add-modal__section">
          <div
            className="select-materials__head"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <label>Состав (сырьё) — на 1 ед. готового товара</label>
            <button
              type="button"
              className="create-client"
              onClick={() => setMaterialsOpen((prev) => !prev)}
              disabled={materialsLoading}
            >
              {materialsOpen
                ? "Скрыть список"
                : materialsLoading
                ? "Загрузка…"
                : "+ Добавить сырьё"}
            </button>
          </div>

          {materialsOpen && (
            <div
              className="select-materials__head-search"
              style={{ marginTop: 8 }}
            >
              <input
                className="add-modal__input"
                name="materialQuery"
                placeholder="Поиск сырья"
                value={materialQuery}
                onChange={(e) => setMaterialQuery(e.target.value)}
              />
            </div>
          )}

          {materialsOpen && (
            <div
              className="select-materials__check active"
              style={{
                marginTop: 8,
                position: "relative",
                maxHeight: 260,
                overflow: "auto",
                border: "1px solid var(--border,#333)",
                borderRadius: 8,
                padding: 8,
              }}
            >
              {filteredMaterials?.map((m) => {
                const checked = recipeMap.has(String(m.id));
                const qty = recipeMap.get(String(m.id)) ?? "";

                return (
                  <div
                    key={m.id}
                    className="select-materials__item"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr 160px",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 4px",
                    }}
                  >
                    <Checkbox
                      icon={<CheckBoxOutlineBlankIcon sx={{ fontSize: 28 }} />}
                      checkedIcon={<CheckBoxIcon sx={{ fontSize: 28 }} />}
                      checked={checked}
                      onChange={() => toggleRecipeItem(m.id)}
                      sx={{
                        color: "#000",
                        "&.Mui-checked": { color: "#f9cf00" },
                      }}
                    />
                    <p
                      title={m.name ?? m.title ?? `#${m.id}`}
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {m.name ?? m.title ?? `#${m.id}`}
                    </p>
                    <TextField
                      size="small"
                      placeholder="Кол-во на 1 ед. (не обязательно)"
                      type="number"
                      inputProps={{ step: "0.0001", min: "0" }}
                      disabled={!checked}
                      value={qty}
                      onChange={(e) => changeRecipeQty(m.id, e.target.value)}
                    />
                  </div>
                );
              })}

              {(!filteredMaterials || filteredMaterials.length === 0) &&
                !materialsLoading && (
                  <div style={{ padding: 8, opacity: 0.7 }}>
                    Ничего не найдено…
                  </div>
                )}
            </div>
          )}

          {recipeItems.length > 0 && (
            <div
              className="select-materials__selected"
              style={{ marginTop: 10 }}
            >
              {recipeItems.map((it) => {
                const mat = (Array.isArray(materials) ? materials : []).find(
                  (m) => String(m.id) === String(it.materialId)
                );
                return (
                  <div
                    key={it.materialId}
                    className="select-materials__selected-item"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 160px 40px",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 0",
                      borderBottom: "1px dashed var(--border,#444)",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <Checkbox
                        checked
                        onChange={() => removeRecipeItem(it.materialId)}
                        sx={{
                          color: "#000",
                          "&.Mui-checked": { color: "#f9cf00" },
                        }}
                      />
                      <p>{mat?.name ?? mat?.title ?? `ID ${it.materialId}`}</p>
                    </div>
                    <TextField
                      size="small"
                      placeholder="Кол-во на 1 ед. (не обязательно)"
                      type="number"
                      inputProps={{ step: "0.0001", min: "0" }}
                      value={it.quantity}
                      onChange={(e) =>
                        changeRecipeQty(it.materialId, e.target.value)
                      }
                    />
                    <button
                      type="button"
                      className="select-materials__remove"
                      onClick={() => removeRecipeItem(it.materialId)}
                      aria-label="Удалить"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        border: "1px solid var(--border,#444)",
                        background: "transparent",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="add-modal__footer">
          <button
            className="add-modal__cancel"
            onClick={onClose}
            disabled={creating}
          >
            Отмена
          </button>
          <button
            className="add-modal__save"
            onClick={handleSubmit}
            disabled={creating || materialsLoading}
          >
            {creating ? "Добавление..." : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   Модалка редактирования товара
   ============================================================ */
const EditModal = ({ item, onClose, onSaveSuccess, onDeleteConfirm }) => {
  const dispatch = useDispatch();
  const { updating, updateError, deleting, deleteError } = useSelector(
    (state) => state.product
  );

  const { brands, categories } = useProducts();
  const { list } = useClient();
  const filterClient1 = (list || []).filter((c) => c.type === "suppliers");

  // Нормализуем имена полей, чтобы соответствовали select'ам: brand_name / category_name
  const [editedItem, setEditedItem] = useState({
    id: item.id || "",
    name: item.name || "",
    barcode: item.barcode || "",
    brand_name: item.brand_name || item.brand || "",
    category_name: item.category_name || item.category || "",
    client: item.client || "",
    price: item.price ?? "",
    purchase_price: item.purchase_price ?? "",
    quantity: item.quantity ?? "",
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setEditedItem((prevData) => ({
      ...prevData,
      [name]: type === "number" ? (value === "" ? "" : value) : value,
    }));
  };

  const handleSave = async () => {
    try {
      const dataToSave = {
        ...editedItem,
        price: parseFloat(editedItem.price),
        purchase_price: parseFloat(editedItem.purchase_price),
        quantity: parseInt(editedItem.quantity, 10),
      };

      await dispatch(
        updateProductAsync({ productId: item.id, updatedData: dataToSave })
      ).unwrap();
      onClose();
      onSaveSuccess?.();
    } catch (err) {
      console.error("Failed to update product:", err);
      alert(
        `Ошибка при обновлении товара: ${err.message || JSON.stringify(err)}`
      );
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(`Вы уверены, что хотите удалить товар "${item?.name}"?`)
    ) {
      try {
        await dispatch(deleteProductAsync(item.id)).unwrap();
        onClose();
        onDeleteConfirm?.();
      } catch (err) {
        console.error("Failed to delete product:", err);
        alert(
          `Ошибка при удалении товара: ${err.message || JSON.stringify(err)}`
        );
      }
    }
  };

  useEffect(() => {
    // Обновим справочники на случай, если не загружены
    dispatch(fetchBrandsAsync());
    dispatch(fetchCategoriesAsync());
    dispatch(fetchClientsAsync());
  }, [dispatch]);

  return (
    <div className="edit-modal sklad">
      <div className="edit-modal__overlay" onClick={onClose} />
      <div className="edit-modal__content">
        <div className="edit-modal__header">
          <h3>Редактирование товара {item?.name}</h3>
          <X className="edit-modal__close-icon" size={20} onClick={onClose} />
        </div>

        {updateError && (
          <p className="edit-modal__error-message">
            Ошибка обновления:{" "}
            {updateError.message || JSON.stringify(updateError)}
          </p>
        )}
        {deleteError && (
          <p className="edit-modal__error-message">
            Ошибка удаления:{" "}
            {deleteError.message || JSON.stringify(deleteError)}
          </p>
        )}

        {/* Название */}
        <div className="edit-modal__section">
          <label>Название *</label>
          <input
            type="text"
            name="name"
            value={editedItem.name}
            onChange={handleChange}
            required
          />
        </div>

        {/* Штрих код */}
        <div className="edit-modal__section">
          <label>Штрих код *</label>
          <input
            type="text"
            name="barcode"
            value={editedItem.barcode}
            onChange={handleChange}
            required
          />
        </div>

        {/* Бренд */}
        <div className="edit-modal__section">
          <label>Бренд *</label>
          <select
            name="brand_name"
            value={editedItem.brand_name}
            onChange={handleChange}
            required
          >
            <option value="">-- Выберите бренд --</option>
            {brands?.map((brand) => (
              <option key={brand.id} value={brand.name}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        {/* Категория */}
        <div className="edit-modal__section">
          <label>Категория *</label>
          <select
            name="category_name"
            value={editedItem.category_name}
            onChange={handleChange}
            required
          >
            <option value="">-- Выберите категорию --</option>
            {categories?.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Поставщик */}
        <div className="edit-modal__section">
          <label>Поставщик *</label>
          <select
            name="client"
            value={editedItem.client}
            onChange={handleChange}
            required
          >
            <option value="">-- Выберите поставщика --</option>
            {filterClient1?.map((client) => (
              <option key={client.id} value={client.id}>
                {client.full_name}
              </option>
            ))}
          </select>
        </div>

        {/* Розничная цена */}
        <div className="edit-modal__section">
          <label>Розничная цена *</label>
          <input
            type="number"
            name="price"
            value={editedItem.price}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
          />
        </div>

        {/* Закупочная цена */}
        <div className="edit-modal__section">
          <label>Закупочная цена *</label>
          <input
            type="number"
            name="purchase_price"
            value={editedItem.purchase_price}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
          />
        </div>

        {/* Количество */}
        <div className="edit-modal__section">
          <label>Количество *</label>
          <input
            type="number"
            name="quantity"
            value={editedItem.quantity}
            onChange={handleChange}
            min="0"
            required
          />
        </div>

        <div className="edit-modal__footer">
          <button
            className="edit-modal__reset"
            onClick={handleDelete}
            disabled={deleting || updating}
          >
            {deleting ? "Удаление..." : "Удалить"}
          </button>
          <button
            className="edit-modal__save"
            onClick={handleSave}
            disabled={updating || deleting}
          >
            {updating ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
};

const TransferProductModal = ({
  onClose,
  onChanged,
  item,
  /** Необязательно: можно передать список материалов и флаг загрузки
   * Материал: { id, name?, title? }
   */
  // materials: products = [],
  materialsLoading = false,
}) => {
  const { list: clients } = useClient();
  const { employees } = useDepartments();
  const { creating, createError } = useSelector((state) => state.transfer);
  const { list: products } = useProducts();

  const [state, setState] = useState({
    agent: "",
    product: item?.id || "",
    qty_transferred: "",
  });
  const [validationError, setValidationError] = useState("");

  // New state for bulk transfers
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Фильтрация товаров для bulk transfer
  const filteredProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = String(p.name ?? p.title ?? `#${p.id}`).toLowerCase();
      return name.includes(q);
    });
  }, [products, searchQuery]);

  // Добавление товара в список для передачи
  const addProductToTransfer = (product) => {
    if (selectedProducts.find((p) => p.id === product.id)) return;

    setSelectedProducts((prev) => [
      ...prev,
      {
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        qty_transferred: 1,
      },
    ]);
  };

  // Удаление товара из списка
  const removeProductFromTransfer = (productId) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // Обновление количества для передачи
  const updateProductQuantity = (productId, quantity) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, qty_transferred: quantity } : p
      )
    );
  };

  const filterClient = useMemo(
    () => clients.filter((c) => c.type === "implementers"),
    [clients]
  );
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchClientsAsync());
    dispatch(fetchProductsAsync());
    dispatch(getEmployees());
  }, [dispatch]);

  // Проверяем, что товар существует и есть в наличии
  if (!item) {
    return (
      <div className="add-modal">
        <div className="add-modal__overlay" onClick={onClose} />
        <div className="add-modal__content">
          <div className="add-modal__header">
            <h3>Ошибка</h3>
            <X className="add-modal__close-icon" size={20} onClick={onClose} />
          </div>
          <p className="add-modal__error-message">
            Товар не найден или недоступен для передачи
          </p>
        </div>
      </div>
    );
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setState((prev) => ({ ...prev, [name]: value }));
    setValidationError(""); // Очищаем ошибку при изменении
  };

  const validateForm = () => {
    if (!state.agent) {
      setValidationError("Выберите агента");
      return false;
    }

    if (selectedProducts.length === 0) {
      setValidationError("Выберите хотя бы один товар для передачи");
      return false;
    }

    // Проверяем количество для каждого товара
    for (const product of selectedProducts) {
      if (!product.qty_transferred || Number(product.qty_transferred) <= 0) {
        setValidationError(
          `Введите корректное количество для товара "${product.name}"`
        );
        return false;
      }
      if (Number(product.qty_transferred) > Number(product.quantity)) {
        setValidationError(
          `Недостаточно товара "${product.name}". Доступно: ${product.quantity}`
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      // Bulk transfer
      const items = selectedProducts.map((product) => ({
        product: product.id,
        qty_transferred: Number(product.qty_transferred),
      }));

      await dispatch(
        createBulkTransferAsync({
          agent: state.agent,
          items: items,
        })
      ).unwrap();

      alert(`Успешно передано ${selectedProducts.length} товаров агенту!`);

      onChanged?.();
      onClose();
    } catch (error) {
      console.error("Transfer creation failed:", error);
      alert(
        `Ошибка при создании передачи: ${
          error?.message || "неизвестная ошибка"
        }`
      );
    }
  };

  return (
    <div className="add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content">
        <div className="add-modal__header">
          <h3>Передать товар</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>

        {createError && (
          <p className="add-modal__error-message">
            Ошибка создания передачи: {createError?.message || "ошибка"}
          </p>
        )}
        {validationError && (
          <p className="add-modal__error-message">{validationError}</p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="add-modal__section">
            <label>Агент *</label>
            <select
              style={{ width: "100%" }}
              onChange={onChange}
              name="agent"
              className="debt__input"
              value={state.agent}
              required
            >
              <option value="" disabled>
                Выберите реализатора
              </option>
              {employees?.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="add-modal__section">
            <h4>Выбор товаров для передачи</h4>

            {/* Поиск товаров */}
            <div style={{ marginBottom: "15px" }}>
              <input
                type="text"
                placeholder="Поиск товаров..."
                className="add-modal__input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: "100%" }}
              />
            </div>

            {/* Список доступных товаров */}
            <div
              style={{
                maxHeight: "200px",
                overflow: "auto",
                border: "1px solid #ccc",
                borderRadius: "4px",
                padding: "10px",
              }}
            >
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div>
                    <strong>{product.name}</strong>
                    <br />
                    <small>Доступно: {product.quantity}</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => addProductToTransfer(product)}
                    disabled={
                      selectedProducts.find((p) => p.id === product.id) ||
                      product.quantity <= 0
                    }
                    style={{
                      padding: "5px 10px",
                      background: selectedProducts.find(
                        (p) => p.id === product.id
                      )
                        ? "#ccc"
                        : "#f9cf00",
                      border: "none",
                      borderRadius: "4px",
                      cursor: selectedProducts.find((p) => p.id === product.id)
                        ? "not-allowed"
                        : "pointer",
                    }}
                  >
                    {selectedProducts.find((p) => p.id === product.id)
                      ? "Добавлен"
                      : "Добавить"}
                  </button>
                </div>
              ))}
            </div>

            {/* Выбранные товары */}
            {selectedProducts.length > 0 && (
              <div style={{ marginTop: "15px" }}>
                <h5>Выбранные товары:</h5>
                {selectedProducts.map((product) => (
                  <div
                    key={product.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <div>
                      <strong>{product.name}</strong>
                      <br />
                      <small>Доступно: {product.quantity}</small>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <input
                        type="number"
                        min="1"
                        max={product.quantity}
                        value={product.qty_transferred}
                        onChange={(e) =>
                          updateProductQuantity(product.id, e.target.value)
                        }
                        style={{ width: "80px", padding: "5px" }}
                      />
                      <button
                        type="button"
                        onClick={() => removeProductFromTransfer(product.id)}
                        style={{
                          padding: "5px 10px",
                          background: "#ff4444",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            style={{
              marginTop: 15,
              width: "100%",
              justifyContent: "center",
            }}
            className="btn edit-btn"
            type="submit"
            disabled={creating}
          >
            {creating ? "Создание..." : "Отправить"}
          </button>
        </form>
      </div>
    </div>
  );
};

// export default TransferProductModal;

const AcceptProductModal = ({ onClose, onChanged, item }) => {
  const { list: clients } = useClient();
  const { acceptingInline, acceptInlineError } = useSelector(
    (state) => state.acceptance
  );
  const { employees } = useDepartments();
  const { list: cashBoxes } = useCash();
  const [state, setState] = useState({
    agent_id: "",
    product_id: item?.id || "",
    qty: "",
  });
  const [selectedCashBox, setSelectedCashBox] = useState("");
  const [validationError, setValidationError] = useState("");

  const filterClient = useMemo(
    () => clients.filter((c) => c.type === "implementers"),
    [clients]
  );
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchClientsAsync());
    dispatch(getEmployees());
    dispatch(getCashBoxes());
  }, [dispatch]);

  // Проверяем, что товар существует
  if (!item) {
    return (
      <div className="add-modal">
        <div className="add-modal__overlay" onClick={onClose} />
        <div className="add-modal__content" style={{ height: "auto" }}>
          <div className="add-modal__header">
            <h3>Ошибка</h3>
            <X className="add-modal__close-icon" size={20} onClick={onClose} />
          </div>
          <p className="add-modal__error-message">
            Товар не найден или недоступен для приёмки
          </p>
        </div>
      </div>
    );
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setState((prev) => ({ ...prev, [name]: value }));
    setValidationError(""); // Очищаем ошибку при изменении
  };

  const validateForm = () => {
    if (!state.agent_id) {
      setValidationError("Выберите агента");
      return false;
    }
    if (!selectedCashBox) {
      setValidationError("Выберите кассу");
      return false;
    }
    if (!state.qty || Number(state.qty) <= 0) {
      setValidationError("Введите корректное количество");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const result = await dispatch(
        acceptInlineAsync({
          agent_id: state.agent_id,
          product_id: state.product_id,
          qty: Number(state.qty),
        })
      ).unwrap();

      // Обновляем количество товара на складе
      await dispatch(
        updateProductAsync({
          productId: item.id,
          updatedData: {
            quantity:
              Number(item.quantity) + Number(result.qty_remaining_after),
          },
        })
      ).unwrap();

      // Добавляем приход в кассу
      await dispatch(
        addCashFlows({
          cashbox: selectedCashBox,
          type: "income",
          name: `Приёмка: ${item.name}`,
          amount: (Number(state.qty) * Number(item.purchase_price)).toFixed(1),
        })
      ).unwrap();

      alert(
        `Приёмка успешно создана!\nАгент: ${result.agent}\nТовар: ${result.product}\nПринято: ${result.qty_accept}\nОстаток: ${result.qty_remaining_after}`
      );

      onChanged?.();
      onClose();
    } catch (error) {
      console.error("Accept inline failed:", error);
      alert(
        `Ошибка при создании приёмки: ${error?.message || "неизвестная ошибка"}`
      );
    }
  };

  return (
    <div className="add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content" style={{ height: "auto" }}>
        <div className="add-modal__header">
          <h3>Принять товар</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>

        {acceptInlineError && (
          <p className="add-modal__error-message">
            Ошибка приёмки: {acceptInlineError?.message || "ошибка"}
          </p>
        )}

        {validationError && (
          <p className="add-modal__error-message">{validationError}</p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="add-modal__section">
            <label>Агент *</label>
            <select
              style={{ marginTop: 15, width: "100%" }}
              onChange={onChange}
              name="agent_id"
              className="debt__input"
              value={state.agent_id}
              required
            >
              <option value="" disabled>
                Выберите агента
              </option>
              {employees?.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.first_name} {employee.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="add-modal__section">
            <label>Касса *</label>
            <select
              style={{ marginTop: 15, width: "100%" }}
              onChange={(e) => setSelectedCashBox(e.target.value)}
              name="cashbox_id"
              className="debt__input"
              value={selectedCashBox}
              required
            >
              <option value="" disabled>
                Выберите кассу
              </option>
              {cashBoxes?.map((cashbox) => (
                <option key={cashbox.id} value={cashbox.id}>
                  {cashbox.name ?? cashbox.department_name}
                </option>
              ))}
            </select>
          </div>

          <div className="add-modal__section">
            <h4>Товар: {item?.name}</h4>
            <p style={{ opacity: 0.7, margin: "5px 0" }}>
              Текущее количество на складе:{" "}
              <strong>{item?.quantity || 0}</strong>
            </p>
            <p style={{ opacity: 0.7, margin: "5px 0" }}>
              Закупочная цена: <strong>{item?.purchase_price || 0} сом</strong>
            </p>
          </div>

          <div className="add-modal__section">
            <label>Количество *</label>
            <input
              style={{ marginTop: 15, width: "100%" }}
              type="number"
              name="qty"
              placeholder="Количество"
              className="debt__input"
              value={state.qty}
              onChange={onChange}
              min={1}
              step={1}
              required
            />
            <small style={{ opacity: 0.7, marginTop: 5, display: "block" }}>
              Сумма к зачислению:{" "}
              {state.qty && item?.purchase_price
                ? (Number(state.qty) * Number(item.purchase_price)).toFixed(1)
                : 0}{" "}
              сом
            </small>
          </div>

          <button
            style={{
              marginTop: 15,
              width: "100%",
              justifyContent: "center",
            }}
            className="btn edit-btn"
            type="submit"
            disabled={acceptingInline}
          >
            {acceptingInline ? "Приёмка..." : "Принять"}
          </button>
        </form>
      </div>
    </div>
  );
};

const ReturnProductModal = ({ onClose, onChanged, item }) => {
  const { list: clients } = useClient();
  const { employees } = useDepartments();
  const { creating, createError } = useSelector(
    (state) => state.return || { creating: false, createError: null }
  );
  const [state, setState] = useState({
    subreal: item?.id || "",
    qty: "",
  });
  const [validationError, setValidationError] = useState("");

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchClientsAsync());
    dispatch(getEmployees());
  }, [dispatch]);

  // Проверяем, что товар существует
  if (!item) {
    return (
      <div className="add-modal">
        <div className="add-modal__overlay" onClick={onClose} />
        <div className="add-modal__content" style={{ height: "auto" }}>
          <div className="add-modal__header">
            <h3>Ошибка</h3>
            <X className="add-modal__close-icon" size={20} onClick={onClose} />
          </div>
          <p className="add-modal__error-message">
            Товар не найден или недоступен для возврата
          </p>
        </div>
      </div>
    );
  }

  const onChange = (e) => {
    const { name, value } = e.target;
    setState((prev) => ({ ...prev, [name]: value }));
    setValidationError("");
  };

  const validateForm = () => {
    if (!state.qty || Number(state.qty) <= 0) {
      setValidationError("Введите корректное количество");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await dispatch(
        createReturnAsync({
          subreal: state.subreal,
          qty: Number(state.qty),
        })
      ).unwrap();

      alert(`Возврат успешно создан!\nКоличество: ${state.qty}`);

      onChanged?.();
      onClose();
    } catch (error) {
      console.error("Return creation failed:", error);
      alert(
        `Ошибка при создании возврата: ${
          error?.message || "неизвестная ошибка"
        }`
      );
    }
  };

  return (
    <div className="add-modal">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content" style={{ height: "auto" }}>
        <div className="add-modal__header">
          <h3>Вернуть товар</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>

        {createError && (
          <p className="add-modal__error-message">
            Ошибка создания возврата: {createError?.message || "ошибка"}
          </p>
        )}

        {validationError && (
          <p className="add-modal__error-message">{validationError}</p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="add-modal__section">
            <h4>Товар: {item?.name}</h4>
            <p style={{ opacity: 0.7, margin: "5px 0" }}>
              Текущее количество у агента:{" "}
              <strong>{item?.qty_on_agent || 0}</strong>
            </p>
          </div>

          <div className="add-modal__section">
            <label>Количество для возврата *</label>
            <input
              style={{ marginTop: 15, width: "100%" }}
              type="number"
              name="qty"
              placeholder="Количество"
              className="debt__input"
              value={state.qty}
              onChange={onChange}
              min={1}
              max={item?.qty_on_agent || 0}
              step={1}
              required
            />
            <small style={{ opacity: 0.7, marginTop: 5, display: "block" }}>
              Максимум: {item?.qty_on_agent || 0}
            </small>
          </div>

          <button
            style={{
              marginTop: 15,
              width: "100%",
              justifyContent: "center",
            }}
            className="btn edit-btn"
            type="submit"
            disabled={creating}
          >
            {creating ? "Возврат..." : "Вернуть"}
          </button>
        </form>
      </div>
    </div>
  );
};

/* ============================================================
   Основной экран «Склад готовой продукции»
   ============================================================ */
const toStartOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const toEndOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const safeDate = (s) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

const FinishedGoods = ({ products, onChanged }) => {
  const dispatch = useDispatch();
  const { categories, loading, error } = useProducts();
  const { list: cashBoxes } = useCash();

  const [cashboxId, setCashboxId] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  // состояние для редактирования
  const [showEdit, setShowEdit] = useState(false);
  const [showMarriageModal, setShowMarriageModal] = useState(false);
  const [showTransferProductModal, setShowTransferProductModal] =
    useState(false);
  const [showAcceptProductModal, setShowAcceptProductModal] = useState(false);
  const [showReturnProductModal, setShowReturnProductModal] = useState(false);
  const [itemId, setItemId] = useState({});
  const [itemId1, setItemId1] = useState({});
  const [itemId2, setItemId2] = useState({});
  const [itemId3, setItemId3] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Фильтр по дате
  const [dateFrom, setDateFrom] = useState(""); // YYYY-MM-DD
  const [dateTo, setDateTo] = useState(""); // YYYY-MM-DD

  useEffect(() => {
    dispatch(fetchCategoriesAsync());
    dispatch(getCashBoxes());
    dispatch(getItemsMake()); // сырьё для модалки
    dispatch(fetchBrandsAsync());
    // чтобы EditModal сразу имел список поставщиков:
    dispatch(fetchClientsAsync());
  }, [dispatch]);

  const onSaveSuccess = () => {
    setShowAdd(false);
    dispatch(fetchProductsAsync());
    dispatch(getItemsMake());
  };

  const onEditSaved = () => {
    setShowEdit(false);
    setSelectedItem(null);
    dispatch(fetchProductsAsync());
  };
  const handleOpen = (id) => {
    setShowMarriageModal(true);
    setItemId(id);
  };
  const handleOpen1 = (item) => {
    setShowTransferProductModal(true);
    setItemId1(item);
  };
  const handleOpen2 = (item) => {
    setShowAcceptProductModal(true);
    setItemId2(item);
  };
  const handleOpen3 = (item) => {
    setShowReturnProductModal(true);
    setItemId3(item);
  };

  const onEditDeleted = () => {
    setShowEdit(false);
    setSelectedItem(null);
    dispatch(fetchProductsAsync());
  };

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setDateFrom("");
    setDateTo("");
  };

  // Фильтрация по названию, категории и ДАТЕ created_at
  const viewProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = dateFrom ? toStartOfDay(dateFrom) : null;
    const to = dateTo ? toEndOfDay(dateTo) : null;

    let filteredProducts = (products || []).filter((p) => {
      const okName = !q || (p.name || "").toLowerCase().includes(q);
      const okCat =
        !categoryFilter ||
        String(p.category_id || p.category)?.toLowerCase() ===
          String(categoryFilter).toLowerCase();

      // фильтр по дате
      const created = safeDate(p.created_at);
      if (!created) return false;
      if (from && created < from) return false;
      if (to && created > to) return false;

      return okName && okCat;
    });

    // Показываем все товары (можно раскомментировать строку ниже для фильтрации только принятых агентами)
    // filteredProducts = filteredProducts.filter((p) => p.qty_on_agent > 0);

    return filteredProducts.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }, [products, search, categoryFilter, dateFrom, dateTo]);

  const openEdit = (product) => {
    setSelectedItem(product);
    setShowEdit(true);
  };

  return (
    <div className="sklad__warehouse">
      <div className="sklad__header">
        <div
          className="sklad__left"
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Поиск по названию товара"
            className="sklad__search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {/* Новый блок фильтра по дате */}
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <label style={{ opacity: 0.7 }}>От</label>
            <input
              type="date"
              className="employee__search-wrapper"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <label style={{ opacity: 0.7 }}>До</label>
            <input
              type="date"
              className="employee__search-wrapper"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            <button
              type="button"
              className="sklad__add"
              style={{ padding: "6px 10px" }}
              onClick={resetFilters}
            >
              Сбросить
            </button>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button className="sklad__add" onClick={() => setShowAdd(true)}>
            <Plus size={16} style={{ marginRight: 4 }} />
            Добавить товар
          </button>
          <button
            className="sklad__add"
            onClick={() => setShowTransferProductModal(true)}
          >
            <Plus size={16} style={{ marginRight: 4 }} />
            Передать товар
          </button>
        </div>
      </div>

      <div style={{ margin: "8px 0", opacity: 0.8 }}>
        Найдено: {viewProducts.length}
        {products?.length ? ` из ${products.length}` : ""}
      </div>

      {loading ? (
        <p className="sklad__loading-message">Загрузка товаров...</p>
      ) : error ? (
        <p className="sklad__error-message">Ошибка загрузки</p>
      ) : viewProducts.length === 0 ? (
        <p className="sklad__no-products-message">Нет доступных товаров.</p>
      ) : (
        <div className="table-wrapper">
          <table className="sklad__table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" />
                </th>
                <th></th>
                <th>№</th>
                <th>Название</th>
                <th>Поставщик</th>
                <th>Цена</th>
                <th>Дата</th>
                <th>Количество / У агентов</th>
                <th>Категория</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {viewProducts.map((item, idx) => (
                <tr key={item.id}>
                  <td>
                    <input type="checkbox" />
                  </td>
                  <td>
                    {/* Кнопка для открытия модалки редактирования */}
                    <button
                      type="button"
                      title="Редактировать"
                      onClick={() => openEdit(item)}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                      }}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </td>
                  <td>{idx + 1}</td>
                  <td>
                    <strong>{item.name}</strong>
                  </td>
                  <td>{item.client_name || "-"}</td>
                  <td>{item.price}</td>
                  <td>{new Date(item.created_at).toLocaleString()}</td>
                  <td>
                    <div>
                      <div>На складе: {item.quantity}</div>
                      {item.qty_on_agent > 0 && (
                        <div style={{ fontSize: "12px", color: "#28a745" }}>
                          У агентов: {item.qty_on_agent}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{item.category || item.category_name || "-"}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "5px",
                        flexDirection: "column",
                      }}
                    >
                      <button
                        className="btn edit-btn"
                        onClick={() => handleOpen(item)}
                        style={{ fontSize: "12px", padding: "4px 8px" }}
                      >
                        В брак
                      </button>
                      {item.qty_on_agent > 0 && (
                        <button
                          className="btn edit-btn"
                          onClick={() => handleOpen3(item)}
                          style={{
                            fontSize: "12px",
                            padding: "4px 8px",
                            background: "#28a745",
                            color: "white",
                          }}
                        >
                          Принять возврат
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onSaveSuccess={onSaveSuccess}
          selectCashBox={cashboxId}
        />
      )}

      {showEdit && selectedItem && (
        <EditModal
          item={selectedItem}
          onClose={() => {
            setShowEdit(false);
            setSelectedItem(null);
          }}
          onSaveSuccess={onEditSaved}
          onDeleteConfirm={onEditDeleted}
        />
      )}
      {showMarriageModal && (
        <MarriageModal
          onClose={() => setShowMarriageModal(false)}
          onChanged={onChanged}
          item={itemId}
        />
      )}
      {showTransferProductModal && (
        <TransferProductModal
          onClose={() => setShowTransferProductModal(false)}
          onChanged={onChanged}
          item={itemId1}
        />
      )}
      {showAcceptProductModal && (
        <AcceptProductModal
          onClose={() => setShowAcceptProductModal(false)}
          onChanged={onChanged}
          item={itemId2}
        />
      )}
      {showReturnProductModal && (
        <ReturnProductModal
          onClose={() => setShowReturnProductModal(false)}
          onChanged={onChanged}
          item={itemId3}
        />
      )}
    </div>
  );
};

export default FinishedGoods;
