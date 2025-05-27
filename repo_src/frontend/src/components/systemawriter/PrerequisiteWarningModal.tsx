import React from 'react';
import '../../styles/Modal.css'; // We'll create this CSS file

interface PrerequisiteWarningModalProps {
    isOpen: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

const PrerequisiteWarningModal: React.FC<PrerequisiteWarningModalProps> = ({ isOpen, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h4>⚠️ Warning</h4>
                <p>{message}</p>
                <div className="modal-actions">
                    <button onClick={onConfirm} className="confirm-button">Proceed Anyway</button>
                    <button onClick={onCancel} className="cancel-button">Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default PrerequisiteWarningModal; 