<?php
/**
 * Copyright since 2007 PrestaShop SA and Contributors
 * PrestaShop is an International Registered Trademark & Property of PrestaShop SA
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this package in the file LICENSE.md.
 * It is also available through the world-wide-web at this URL:
 * https://opensource.org/licenses/OSL-3.0
 * If you did not receive a copy of the license and are unable to
 * obtain it through the world-wide-web, please send an email
 * to license@prestashop.com so we can send you a copy immediately.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade PrestaShop to newer
 * versions in the future. If you wish to customize PrestaShop for your
 * needs please refer to https://devdocs.prestashop.com/ for more information.
 *
 * @author    PrestaShop SA and Contributors <contact@prestashop.com>
 * @copyright Since 2007 PrestaShop SA and Contributors
 * @license   https://opensource.org/licenses/OSL-3.0 Open Software License (OSL 3.0)
 */

namespace PrestaShopBundle\Command;

use Employee;
use PrestaShop\PrestaShop\Adapter\LegacyContext;
use Symfony\Bundle\FrameworkBundle\Command\ContainerAwareCommand;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class ModulesInstallerCommand extends ContainerAwareCommand
{
    private $allowedActions = [
        'install',
        'uninstall',
        'upgrade',
    ];

    /**
     * @var \Symfony\Component\Console\Helper\FormatterHelper
     */
    protected $formatter;

    /**
     * @var \PrestaShopBundle\Translation\Translator
     */
    protected $translator;

    /**
     * @var \PrestaShop\PrestaShop\Core\Addon\Module\ModuleRepository
     */
    protected $moduleRepository;

    /**
     * @var \Symfony\Component\Console\Input\Input
     */
    protected $input;

    /**
     * @var \Symfony\Component\Console\Output\Output
     */
    protected $output;

    /**
     * @var string
     */
    protected $consolePath;

    protected function configure()
    {
        $this
            ->setName('prestashop:install:modules')
            ->setDescription('Syncronize modules with modules.json')
            ->addArgument(
                'action',
                InputArgument::REQUIRED,
                sprintf('Action to execute (Allowed actions: %s).',
                implode(' / ', $this->allowedActions))
            )
            ->addArgument(
                'module name',
                InputArgument::OPTIONAL,
                'Module on which the action will be executed'
            );
    }

    protected function init(InputInterface $input, OutputInterface $output)
    {
        $this->formatter = $this->getHelper('formatter');
        $this->translator = $this->getContainer()->get('translator');
        $this->moduleRepository = $this->getContainer()->get('prestashop.core.admin.module.repository');
        $this->input = $input;
        $this->output = $output;
        $this->consolePath = dirname(dirname(dirname(__DIR__))).'/bin/console';
        /** @var LegacyContext $legacyContext */
        $legacyContext = $this->getContainer()->get('prestashop.adapter.legacy.context');
        //We need to have an employee or the module hooks don't work
        //see LegacyHookSubscriber
        if (!$legacyContext->getContext()->employee) {
            //Even a non existing employee is fine
            $legacyContext->getContext()->employee = new Employee(42);
        }
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $this->init($input, $output);

        $action = $input->getArgument('action');
        $moduleName = $input->getArgument('module name');

        if (!in_array($action, $this->allowedActions)) {
            $this->displayMessage(
                $this->translator->trans(
                    'Unknown action. It must be one of these values: %actions%',
                    ['%actions%' => implode(' / ', $this->allowedActions)],
                    'Admin.Modules.Notification'
                ),
                'error'
            );

            return 1;
        }

        if (null !== $moduleName) {
            return $this->executeModuleAction($action, $moduleName);
        }

        if ('uninstall' == $action) {
            return $this->executeUninstallAction();
        }

        return $this->executeGenericAction($action);
    }

    protected function executeGenericAction($action)
    {
        if (false !== ($moduleList = $this->getModuleList())) {
            foreach ($moduleList as $moduleName) {
                if (!$this->moduleAction($action, $moduleName)) {
                    return 1;
                }
            }
        }

        $this->clearCache();

        return 0;
    }

    protected function executeUninstallAction()
    {
        if (false !== ($moduleList = $this->getModuleList())) {
            foreach ($this->moduleRepository->getInstalledModules() as $module) {
                if (
                    !in_array($module->get('name'), $moduleList)
                    && !$this->moduleAction('uninstall', $module->get('name'))
                ) {
                    return 1;
                }
            }
        }

        $this->clearCache();

        return 0;
    }

    protected function executeModuleAction($action, $moduleName)
    {
        /**
         * @var ModuleManager
         */
        $moduleManager = $this
            ->getContainer()
            ->get('prestashop.module.manager')
            ->setActionParams([
                'cacheClearEnabled' => false,
            ])
        ;

        if (!$moduleManager->{$action}($moduleName)) {
            $this->output->writeln(strip_tags(html_entity_decode(
                $moduleManager->getError($moduleName)
            )));
        
            return 1;
        }
        
        return 0;
    }

    protected function moduleAction($action, $moduleName)
    {
        switch ($action) {
            case 'install':
                $message = $this->translator->trans(
                    'Installing/Upgrading module %module%',
                    ['%module%' => $moduleName],
                    'Admin.Modules.Notification'
                );
                break;
            case 'uninstall':
                $message = $this->translator->trans(
                    'Uninstalling module %module%',
                    ['%module%' => $moduleName],
                    'Admin.Modules.Notification'
                );
                break;
            case 'upgrade':
                $message = $this->translator->trans(
                    'Upgrading module %module%',
                    ['%module%' => $moduleName],
                    'Admin.Modules.Notification'
                );
                break;
            default:
                return;
        }

        $this->displayMessage($message.'...');

        exec(
            'php '.escapeshellarg($this->consolePath).' prestashop:install:modules '.$action.' '.escapeshellarg($moduleName),
            $output,
            $returnCode
        );

        if ($returnCode !== 0) {
            $this->displayMessage($output, 'error');

            return false;
        }

        return true;
    }

    protected function getModuleList()
    {
        if (file_exists($file = _PS_ROOT_DIR_.'/modules.json')) {
            return json_decode(file_get_contents($file));
        }

        $this->displayMessage(
            $this->translator->trans(
                'File not found: %file%',
                ['%file%' => $file],
                'Admin.Modules.Notification'
            ),
            'error'
        );

        return false;
    }

    protected function displayMessage($message, $type = 'info')
    {
        $this->output->writeln(
            $this->formatter->formatBlock($message, $type, 'error' === $type)
        );
    }

    protected function clearCache()
    {
        $this
            ->getContainer()
            ->get('prestashop.adapter.cache.clearer.symfony_cache_clearer')
            ->clear()
        ;
    }
}
