/**
 * HistoryDrawer 组件
 * 项目历史记录抽屉
 */

import { History, X, Trash2 } from "lucide-react";
import { HistoryItem } from "@/store/useProjectStore";
import styles from "@/components/HistoryDrawer/index.module.scss";

/**
 * HistoryDrawer 组件的 Props
 */
interface HistoryDrawerProps {
  /** 抽屉是否打开 */
  isOpen: boolean;
  /** 历史记录数据 */
  history: HistoryItem[];
  /** 点击关闭的回调 */
  onClose: () => void;
  /** 点击历史项的回调 */
  onItemClick: (path: string) => void;
  /** 点击删除按钮的回调 */
  onDeleteItem: (path: string) => void;
}

/**
 * HistoryDrawer 组件
 * 展示项目打开历史，用户可以快速打开或删除历史记录
 */
const HistoryDrawer = ({
  isOpen,
  history,
  onClose,
  onItemClick,
  onDeleteItem,
}: HistoryDrawerProps) => {
  return (
    <div className={`${styles.drawer} ${isOpen ? styles.open : ""}`}>
      {/* 抽屉头部 */}
      <div className={styles.drawerHeader}>
        <h2 className={styles.drawerTitle}>
          <History size={20} />
          历史记录
        </h2>
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className={styles.closeButton}
          title="关闭历史记录"
          aria-label="关闭历史记录抽屉"
        >
          <X size={20} />
        </button>
      </div>

      {/* 抽屉内容 */}
      <div className={styles.drawerContent}>
        {/* 空状态 */}
        {history.length === 0 ? (
          <div className={styles.emptyMessage}>暂无历史记录</div>
        ) : (
          /* 历史记录列表 */
          history.map((item) => (
            <div key={item.path} className={styles.historyItem}>
              {/* 点击可打开历史项 */}
              <button
                onClick={() => onItemClick(item.path)}
                className={styles.historyItemContent}
                title={`打开: ${item.name}`}
              >
                {/* 项目名称 */}
                <div className={styles.historyItemName}>
                  {item.name}
                </div>

                {/* 文件路径 */}
                <div className={styles.historyItemPath} title={item.path}>
                  {item.path}
                </div>

                {/* 上次打开时间 */}
                <div className={styles.historyItemTime}>
                  {new Date(item.lastOpened).toLocaleString()}
                </div>
              </button>

              {/* 删除按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item.path);
                }}
                className={styles.deleteButton}
                title="删除这条历史记录"
                aria-label={`删除历史记录: ${item.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryDrawer;
