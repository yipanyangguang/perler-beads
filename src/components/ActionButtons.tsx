/**
 * ActionButtons 组件
 * 首页的主要操作按钮区域（新建/导入项目）
 */

import { FC } from "react";
import { Plus, Upload } from "lucide-react";
import styles from "../pages/Home.module.scss";

/**
 * ActionButtons 组件的 Props
 */
interface ActionButtonsProps {
  /** 点击新建项目按钮的回调 */
  onCreateClick: () => void;
  /** 点击导入项目按钮的回调 */
  onImportClick: () => void;
}

/**
 * ActionButtons 组件
 * 展示两个主要操作按钮
 */
const ActionButtons: FC<ActionButtonsProps> = ({ onCreateClick, onImportClick }) => {
  return (
    <div className={styles.actionCard}>
      {/* 卡片头部 */}
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>开始创作</div>
        <div className={styles.cardSubtitle}>选择一种方式开始你的设计</div>
      </div>

      {/* 卡片内容 */}
      <div className={styles.cardContent}>
        {/* 新建项目按钮 */}
        <button
          onClick={onCreateClick}
          className={`${styles.button} ${styles.primary}`}
          title="创建新项目"
        >
          <Plus size={20} />
          新建项目
        </button>

        {/* 分割线 */}
        <div className={styles.divider}>
          <div className={styles.dividerLine}>
            <span></span>
          </div>
          <div className={styles.dividerText}>
            <span>或者</span>
          </div>
        </div>

        {/* 导入项目按钮 */}
        <button
          onClick={onImportClick}
          className={`${styles.button} ${styles.secondary}`}
          title="导入已有项目"
        >
          <Upload size={20} />
          导入项目
        </button>
      </div>
    </div>
  );
};

export default ActionButtons;
