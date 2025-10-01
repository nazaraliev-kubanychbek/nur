import { X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useEffect, useMemo } from "react";
import { fetchProductsAsync } from "../../../../store/creators/productCreators";
import {
  getCashFlows,
  updateCashFlows,
  useCash,
} from "../../../../store/slices/cashSlice";

const PendingModal = ({ onClose, onChanged, cashName }) => {
  const dispatch = useDispatch();
  const { cashFlows } = useCash();
  const { loading } = useSelector((s) => s.product);

  // pending-база (только со статусом false)
  const basePending = useMemo(
    () => (cashFlows || []).filter((p) => p.status === false),
    [cashFlows]
  );

  const norm = (s) =>
    String(s ?? "")
      .trim()
      .toLowerCase();

  // фильтр по названию кассы (если передан cashName)
  const pending = useMemo(() => {
    if (!cashName) return basePending;
    const target = norm(cashName);
    return basePending.filter((p) => norm(p.cashbox_name) === target);
  }, [basePending, cashName]);

  // гарантированное обновление стора + колбэк родителя
  const refresh = () => {
    // await dispatch(getCashFlows({}));
    onChanged?.();
  };

  const mapType = (t) =>
    t === "income" ? "Приход" : t === "expense" ? "Расход" : "—";

  const handleAccept = async (item) => {
    try {
      await dispatch(
        updateCashFlows({
          productId: item.id,
          updatedData: { status: true },
        })
      ).unwrap();

      await refresh();
      onClose?.();
      // window.location.reload();
    } catch (e) {
      alert("Не удалось отправить товар");
    }
  };

  const handleReject = async (item) => {
    try {
      await dispatch(
        updateCashFlows({
          productId: item.id,
          updatedData: { status: false },
        })
      ).unwrap();

      await refresh();
      onClose?.();
      // window.location.reload();
    } catch (e) {
      alert("Не удалось отклонить товар");
    }
  };

  useEffect(() => {
    dispatch(getCashFlows());
  }, [dispatch]);

  return (
    <div className="add-modal accept">
      <div className="add-modal__overlay" onClick={onClose} />
      <div className="add-modal__content" role="dialog" aria-modal="true">
        <div className="add-modal__header">
          <h3>В ожидании{cashName ? ` • ${cashName}` : ""}</h3>
          <X className="add-modal__close-icon" size={20} onClick={onClose} />
        </div>

        {loading ? (
          <div className="add-modal__section">Загрузка…</div>
        ) : pending.length === 0 ? (
          <div className="add-modal__section">
            Нет товаров со статусом pending.
          </div>
        ) : (
          <div
            className="table-wrapper"
            style={{ maxHeight: 400, overflow: "auto" }}
          >
            <table className="sklad__table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Название</th>
                  <th>Тип</th>
                  <th>Касса</th>
                  <th>Дата</th>
                  <th>Сумма</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((item, idx) => (
                  <tr key={item.id}>
                    <td>{idx + 1}</td>
                    <td>{item.name}</td>
                    <td>{mapType(item.type)}</td>
                    <td>{item.cashbox_name || "—"}</td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>{item.amount ?? "—"}</td>
                    <td>
                      <button
                        className="add-modal__save"
                        style={{ marginRight: 8 }}
                        title="Принять товар"
                        onClick={() => handleAccept(item)}
                      >
                        Отправить
                      </button>
                      <button
                        className="add-modal__cancel"
                        onClick={() => handleReject(item)}
                      >
                        Отказать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="add-modal__footer">
          <button className="add-modal__cancel" onClick={onClose}>
            Закрыть
          </button>
          <button
            className="add-modal__save"
            onClick={() => dispatch(getCashFlows({}))}
          >
            Обновить список
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingModal;
