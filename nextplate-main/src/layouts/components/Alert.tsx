import { FaExclamationTriangle } from 'react-icons/fa';

interface AlertProps{
    message : string;
}

const WarningAlert: React.FC<AlertProps> = ({message}) =>{
    return (
        <div className=" my-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative flex items-center" role="alert">
            <FaExclamationTriangle className="mr-2" />
            <span className="block sm:inline">{message}</span>
        </div>
    )
}

export default WarningAlert;