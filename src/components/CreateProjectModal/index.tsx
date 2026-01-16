/**
 * CreateProjectModal 组件
 * 新建项目的模态对话框
 */

import { X } from "lucide-react";
import styles from "@/components/CreateProjectModal/index.module.scss";

/**
 * CreateProjectModal 组件的 Props
 */
interface CreateProjectModalProps {
  /** 模态框是否打开 */
  isOpen: boolean;
  /** 项目名称 */
  name: string;
  /** 项目宽度 */
  width: number;
  /** 项目高度 */
  height: number;
  /** 项目名称变化回调 */
  onNameChange: (name: string) => void;
  /** 项目宽度变化回调 */
  onWidthChange: (width: number) => void;
  /** 项目高度变化回调 */
  onHeightChange: (height: number) => void;
  /** 点击创建按钮的回调 */
  onCreateClick: () => void;
  /** 点击取消或关闭的回调 */
  onClose: () => void;
}

/**
 * CreateProjectModal 组件
 * 用户在此输入新项目的名称和尺寸
 */
const CreateProjectModal = ({
  isOpen,
  name,
  width,
  height,
  onNameChange,
  onWidthChange,
  onHeightChange,
  onCreateClick,
  onClose,
}: CreateProjectModalProps) => {
  // 如果模态框未打开，返回 null
  if (!isOpen) {
    return null;
  }

  /**
   * 处理确认按钮点击
   * 先执行创建，再关闭模态框
   */
  const handleConfirm = () => {
    onCreateClick();
    onClose();
  };

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        {/* 模态框头部 */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>新建项目</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            title="关闭"
            aria-label="关闭对话框"
          >
            <X size={20} />
          </button>
        </div>

        {/* 模态框正文 */}
        <div className={styles.modalBody}>
          {/* 项目名称表单组 */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>项目名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              className={styles.formInput}
              placeholder="给你的作品起个名字"
              autoFocus
            />
          </div>

          {/* 项目尺寸表单行 */}
          <div className={styles.formRow}>
            {/* 宽度 */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>宽度 (格)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => onWidthChange(Number(e.target.value))}
                className={styles.formInput}
                min="1"
                max="500"
              />
            </div>

            {/* 高度 */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>高度 (格)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => onHeightChange(Number(e.target.value))}
                className={styles.formInput}
                min="1"
                max="500"
              />
            </div>
          </div>
        </div>

        {/* 模态框底部（操作按钮） */}
        <div className={styles.cardFooter}>
          {/* 取消按钮 */}
          <button
            onClick={onClose}
            className={`${styles.button} ${styles.cancel}`}
          >
            取消
          </button>

          {/* 创建按钮 */}
          <button
            onClick={handleConfirm}
            className={`${styles.button} ${styles.confirm}`}
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProjectModal;
